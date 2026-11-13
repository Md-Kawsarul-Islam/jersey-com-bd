/**
 * Jersey.com.bd — API server
 *
 * Public endpoints:
 *   GET  /api/products                 catalog (stock/enabled aware)
 *   POST /api/orders                   place an order
 *   GET  /api/orders/track?q=          track by id / phone / name
 *   POST /api/messages                 contact form
 *   POST /api/subscribers              newsletter
 *
 * Admin endpoints (Authorization: Bearer <token>):
 *   POST /api/admin/login              { password } → { token }
 *   GET  /api/admin/stats              overview for the dashboard
 *   GET  /api/admin/orders             ?status=&search=
 *   GET  /api/admin/orders/:id
 *   PATCH /api/admin/orders/:id/status { status }
 *   DELETE /api/admin/orders/:id
 *   POST /api/admin/products           create product
 *   GET  /api/admin/products           list (search/filter/sort/pagination)
 *   GET  /api/admin/products/:slug     single product
 *   PATCH /api/admin/products/:slug    full product update
 *   DELETE /api/admin/products/:slug   delete (orders keep item snapshots)
 *   POST /api/admin/uploads            image upload (base64 data URLs)
 *   GET  /api/admin/messages           ?unread=
 *   PATCH /api/admin/messages/:id      { read }
 *   DELETE /api/admin/messages/:id
 *   GET  /api/admin/subscribers
 *   GET  /api/admin/subscribers.csv    CSV export
 *   GET  /api/health
 */
import express from 'express';
import crypto from 'crypto';
import { readFileSync, existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadDb,
  persist,
  createOrder,
  updateOrder,
  addOrderItem,
  updateOrderItem,
  removeOrderItem,
  deleteOrder,
  findOrdersByQuery,
  getProducts,
  ORDER_STATUSES,
  normalizeStatus,
  listProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  PRODUCT_CATEGORIES,
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const FREE_DELIVERY_THRESHOLD = Number(process.env.JBD_FREE_DELIVERY_THRESHOLD || 2000);

if (!process.env.ADMIN_PASSWORD) {
  console.warn(
    '[server] =============================================',
    '[server] WARNING: ADMIN_PASSWORD not set — using the development default "admin123".',
    '[server] Set ADMIN_PASSWORD in .env or your host dashboard before exposing this site.',
    '[server] ============================================='
  );
} else if (process.env.ADMIN_PASSWORD === 'admin123') {
  console.warn('[server] WARNING: ADMIN_PASSWORD is "admin123" — please change it.');
}

const app = express();
app.disable('x-powered-by');
// Render (and most hosts) terminate TLS at a proxy — trust the first hop so req.ip is accurate for rate limiting
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

/* -----------------------------------------------------------
   Security headers (applied to every response)
   ----------------------------------------------------------- */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  next();
});

/* -----------------------------------------------------------
   CORS for /api/* — same-origin by default; set ALLOWED_ORIGINS
   (comma-separated) only if you host the frontend elsewhere,
   e.g. ALLOWED_ORIGINS=https://jersey.com.bd
   ----------------------------------------------------------- */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
if (ALLOWED_ORIGINS.length > 0) {
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
}

/* -----------------------------------------------------------
   Tiny in-memory rate limiter (protects /api/admin/login and /api/orders)
   ----------------------------------------------------------- */
const rateLimits = new Map(); // key -> { count, resetAt }
function rateLimit(windowMs, max) {
  return (req, res, next) => {
    const key = `${req.ip || 'unknown'}:${req.route?.path || req.path}`;
    const now = Date.now();
    const entry = rateLimits.get(key);
    if (!entry || entry.resetAt < now) {
      rateLimits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (entry.count >= max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: `Too many attempts. Please try again in ${retryAfter}s.` });
    }
    entry.count += 1;
    next();
  };
}
app.use('/api/admin/login', rateLimit(15 * 60 * 1000, 10));   // 10 attempts / 15 min per IP
app.use('/api/orders', rateLimit(60 * 60 * 1000, 30));        // 30 orders / hour per IP

/* -----------------------------------------------------------
   Production guard — refuse to boot without an admin password
   ----------------------------------------------------------- */
const isProd = process.env.NODE_ENV === 'production';
if (isProd && !process.env.ADMIN_PASSWORD) {
  console.error(
    '[server] REFUSED TO BOOT: NODE_ENV=production but ADMIN_PASSWORD is not set.'
  );
  console.error('[server] Set ADMIN_PASSWORD in your host dashboard (e.g. Render → Environment).');
  process.exit(1);
}

app.use(express.json({ limit: '1mb' }));

/* -----------------------------------------------------------
   Admin session tokens (in-memory, TTL)
   ----------------------------------------------------------- */
const tokens = new Map(); // token → expiry timestamp

function issueToken() {
  const token = crypto.randomBytes(32).toString('hex');
  tokens.set(token, Date.now() + TOKEN_TTL_MS);
  return token;
}

function isValidToken(token) {
  const expiry = tokens.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    tokens.delete(token);
    return false;
  }
  return true;
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !isValidToken(token)) {
    return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
  }
  next();
}

/* small helper for consistent error responses */
const asyncRoute =
  (fn) =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/* -----------------------------------------------------------
   PUBLIC — catalog
   ----------------------------------------------------------- */
app.get('/api/products', (req, res) => {
  const products = getProducts().filter((p) => p.enabled !== false);
  res.json({ products, freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD });
});

app.get('/api/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

/* -----------------------------------------------------------
   PUBLIC — orders
   ----------------------------------------------------------- */
app.post(
  '/api/orders',
  asyncRoute(async (req, res) => {
    const { items, customer, zone, payment, note } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }
    const cleanItems = items
      .map((i) => ({
        slug: String(i.slug || ''),
        size: i.size ? String(i.size).slice(0, 12) : null,
        qty: Math.max(1, Math.min(99, Number(i.qty) || 1)),
      }))
      .filter((i) => i.slug);

    const name = String(customer?.name || '').trim();
    const phone = String(customer?.phone || '').trim();
    const address = String(customer?.address || '').trim();
    if (name.length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
    if (!/^01[3-9]\d{8}$/.test(phone))
      return res.status(400).json({ error: 'Enter a valid BD phone number (01XXXXXXXXX).' });
    if (address.length < 10)
      return res.status(400).json({ error: 'Please enter your full address.' });
    if (!['inside', 'outside'].includes(zone))
      return res.status(400).json({ error: 'Invalid delivery zone.' });
    if (!['cod', 'bkash', 'nagad'].includes(payment))
      return res.status(400).json({ error: 'Invalid payment method.' });

    const order = createOrder(cleanItems, { name, phone, address }, zone, payment, note);
    res.status(201).json({ order });
  })
);

app.get('/api/orders/track', (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ orders: [] });
  const orders = findOrdersByQuery(q).slice(0, 5);
  res.json({ orders });
});

/* -----------------------------------------------------------
   PUBLIC — contact messages & newsletter
   ----------------------------------------------------------- */
app.post('/api/messages', (req, res) => {
  const { name, phone, subject, message } = req.body || {};
  const cleanName = String(name || '').trim();
  const cleanPhone = String(phone || '').trim();
  const cleanMessage = String(message || '').trim();
  if (cleanName.length < 2)
    return res.status(400).json({ error: 'Please enter your name.' });
  if (!/^01[3-9]\d{8}$/.test(cleanPhone))
    return res.status(400).json({ error: 'Enter a valid BD phone number.' });
  if (cleanMessage.length < 10)
    return res.status(400).json({ error: 'Message must be at least 10 characters.' });

  const db = loadDb();
  const msg = {
    id: 'MSG' + Date.now().toString(36) + crypto.randomBytes(2).toString('hex'),
    name: cleanName,
    phone: cleanPhone,
    subject: String(subject || '').trim().slice(0, 200),
    message: cleanMessage.slice(0, 5000),
    read: false,
    createdAt: Date.now(),
  };
  db.messages.unshift(msg);
  persist(db);
  res.status(201).json({ ok: true, id: msg.id });
});

app.post('/api/subscribers', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  const db = loadDb();
  if (db.subscribers.some((s) => s.email === email))
    return res.status(409).json({ error: 'You are already subscribed!' });
  db.subscribers.unshift({ email, createdAt: Date.now() });
  persist(db);
  res.status(201).json({ ok: true });
});

/* -----------------------------------------------------------
   ADMIN — auth
   ----------------------------------------------------------- */
app.post('/api/admin/login', (req, res) => {
  const password = String(req.body?.password || '');
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin password.' });
  }
  res.json({ token: issueToken(), expiresIn: TOKEN_TTL_MS / 1000 });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const header = req.headers.authorization || '';
  tokens.delete(header.slice(7));
  res.json({ ok: true });
});

/* -----------------------------------------------------------
   ADMIN — dashboard stats
   ----------------------------------------------------------- */
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const db = loadDb();
  const active = db.orders.filter((o) => o.status !== 'cancelled' && o.status !== 'refunded');
  const revenue = active.reduce((sum, o) => sum + o.total, 0);
  const activeStatuses = ['pending', 'confirmed', 'processing', 'shipped'];
  const byStatus = db.orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaysOrders = db.orders.filter((o) => o.createdAt >= todayStart.getTime());
  const activeRevenue = db.orders
    .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
    .reduce((sum, o) => sum + o.total, 0);
  res.json({
    totalOrders: db.orders.length,
    pendingOrders: activeStatuses.reduce((n, s) => n + (byStatus[s] || 0), 0),
    confirmedOrders: byStatus.confirmed || 0,
    processingOrders: byStatus.processing || 0,
    shippedOrders: byStatus.shipped || 0,
    deliveredOrders: byStatus.delivered || 0,
    cancelledOrders: byStatus.cancelled || 0,
    refundedOrders: byStatus.refunded || 0,
    revenue: activeRevenue,
    todayOrders: todaysOrders.length,
    todayRevenue: todaysOrders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
      .reduce((sum, o) => sum + o.total, 0),
    unreadMessages: db.messages.filter((m) => !m.read).length,
    subscribers: db.subscribers.length,
    products: db.products.length,
    outOfStock: db.products.filter((p) => p.stock === 0).length,
    recentOrders: db.orders.slice(0, 8),
  });
});

/* -----------------------------------------------------------
   ADMIN — orders
   ----------------------------------------------------------- */
const customerError = (message) => {
  const err = new Error(message);
  err.status = 400;
  return err;
};

function validateCustomerFields(customer) {
  const name = String(customer?.name || '').trim();
  const phone = String(customer?.phone || '').trim();
  const address = String(customer?.address || '').trim();
  if (name.length < 2) throw customerError('Please enter the customer\'s full name.');
  if (!/^01[3-9]\d{8}$/.test(phone)) throw customerError('Enter a valid BD phone number (01XXXXXXXXX).');
  if (address.length < 10) throw customerError('Please enter the full delivery address (min 10 characters).');
  return { name, phone, address };
}
const ZONES = ['inside', 'outside'];
const PAYMENTS = ['cod', 'bkash', 'nagad'];

/** Admin — create a manual order */
app.post(
  '/api/admin/orders',
  asyncRoute(async (req, res) => {
    const { items, customer, zone, payment, note, status, delivery } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Add at least one product to the order.' });
    }
    const cleanCustomer = validateCustomerFields(customer);
    if (!ZONES.includes(zone)) return res.status(400).json({ error: 'Invalid delivery zone.' });
    if (!PAYMENTS.includes(String(payment))) return res.status(400).json({ error: 'Invalid payment method.' });
    const cleanItems = items.map((i) => ({
      slug: i.slug ? String(i.slug) : null,
      name: i.name ? String(i.name).slice(0, 300) : undefined,
      size: i.size ? String(i.size).slice(0, 12) : null,
      qty: Math.floor(Number(i.qty) || 1),
      price: i.price !== undefined && i.price !== null && i.price !== '' ? Number(i.price) : undefined,
      originalPrice: i.originalPrice ?? undefined,
    }));
    if (status !== undefined) {
      const raw = String(status).toLowerCase().trim();
      if (!ORDER_STATUSES.includes(raw) && raw !== 'dispatched') {
        return res.status(400).json({ error: `Status must be one of: ${ORDER_STATUSES.join(', ')}` });
      }
    }
    const order = createOrder(cleanItems, cleanCustomer, zone, payment, note, {
      allowDisabled: true,
      status: status ? status : 'pending',
    });
    if (delivery !== undefined) {
      const d = Number(delivery);
      if (!Number.isFinite(d) || d < 0 || d > 100000) {
        return res.status(400).json({ error: 'Invalid delivery charge.' });
      }
      const db = loadDb();
      order.delivery = Math.round(d);
      order.deliveryOverride = true;
      order.total = order.subtotal + order.delivery;
      persist(db);
    }
    res.status(201).json({ order });
  })
);

/** Tokenized AND search: every whitespace-separated token must match some field. */
const matchesTokens = (haystacks, search) => {
  const tokens = String(search || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const joined = haystacks.join(' ');
  return tokens.every((t) => joined.includes(t));
};

app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const db = loadDb();
  const status = String(req.query.status || '').trim();
  const search = String(req.query.search || '').trim().toLowerCase();
  let orders = [...db.orders];
  if (status && status !== 'all') {
    const normalized = normalizeStatus(status);
    orders = orders.filter((o) => o.status === normalized);
  }
  if (search) {
    orders = orders.filter((o) =>
      matchesTokens(
        [
          o.id,
          o.customer.phone,
          o.customer.name,
          o.customer.address || '',
          ...o.items.map((i) => i.name),
        ].map((s) => String(s).toLowerCase()),
        search
      )
    );
  }
  res.json({ orders, total: orders.length, statuses: ORDER_STATUSES });
});

app.get('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const db = loadDb();
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  res.json({ order });
});

/** Admin — full update of an order (customer, zone, payment, note, delivery, items, status) */
app.patch(
  '/api/admin/orders/:id',
  asyncRoute(async (req, res) => {
    const body = req.body || {};
    const payload = {};
    if (body.customer !== undefined) payload.customer = validateCustomerFields(body.customer);
    if (body.zone !== undefined) {
      if (!ZONES.includes(body.zone)) return res.status(400).json({ error: 'Invalid delivery zone.' });
      payload.zone = body.zone;
    }
    if (body.payment !== undefined) {
      if (!PAYMENTS.includes(String(body.payment))) return res.status(400).json({ error: 'Invalid payment method.' });
      payload.payment = body.payment;
    }
    if (body.note !== undefined) payload.note = body.note;
    if (body.status !== undefined) {
      const raw = String(body.status).toLowerCase().trim();
      if (!ORDER_STATUSES.includes(raw) && raw !== 'dispatched') {
        return res.status(400).json({ error: `Status must be one of: ${ORDER_STATUSES.join(', ')}` });
      }
      payload.status = raw;
    }
    if (body.delivery !== undefined) payload.delivery = body.delivery;
    if (body.items !== undefined) {
      if (!Array.isArray(body.items) || body.items.length === 0) {
        return res.status(400).json({ error: 'An order needs at least one product.' });
      }
      payload.items = body.items.map((i) => ({
        lineId: i.lineId ? String(i.lineId) : undefined,
        slug: i.slug ? String(i.slug) : null,
        name: i.name ? String(i.name).slice(0, 300) : undefined,
        size: i.size ? String(i.size).slice(0, 12) : null,
        qty: Math.floor(Number(i.qty) || 0),
        price: i.price !== undefined && i.price !== null && i.price !== '' ? Number(i.price) : undefined,
        originalPrice: i.originalPrice ?? undefined,
      }));
    }
    const order = updateOrder(req.params.id, payload);
    res.json({ order });
  })
);

/** Admin — quick status change (runs stock restore/re-acquire automatically) */
app.patch(
  '/api/admin/orders/:id/status',
  asyncRoute(async (req, res) => {
    const raw = String(req.body?.status || '').trim().toLowerCase();
    if (!ORDER_STATUSES.includes(raw) && raw !== 'dispatched') {
      return res.status(400).json({ error: `Status must be one of: ${ORDER_STATUSES.join(', ')}` });
    }
    const order = updateOrder(req.params.id, { status: raw });
    res.json({ order });
  })
);

/** Admin — add an item (catalog product or custom one-off item) */
app.post(
  '/api/admin/orders/:id/items',
  asyncRoute(async (req, res) => {
    const { slug, name, price, qty, size, originalPrice } = req.body || {};
    if (!slug && !name) {
      return res.status(400).json({ error: 'Provide a product slug or a custom item name.' });
    }
    const order = addOrderItem(req.params.id, {
      slug: slug ? String(slug) : null,
      name: name ? String(name).slice(0, 300) : undefined,
      price: price !== undefined && price !== null && price !== '' ? Number(price) : undefined,
      qty: Math.floor(Number(qty) || 1),
      size: size ? String(size).slice(0, 12) : null,
      originalPrice,
    });
    res.json({ order });
  })
);

/** Admin — edit a line (qty / price / name / size) */
app.patch(
  '/api/admin/orders/:id/items/:lineId',
  asyncRoute(async (req, res) => {
    const { qty, price, name, size } = req.body || {};
    const patch = {};
    if (qty !== undefined) patch.qty = Number(qty);
    if (price !== undefined) patch.price = Number(price);
    if (name !== undefined) patch.name = name;
    if (size !== undefined) patch.size = size;
    const order = updateOrderItem(req.params.id, req.params.lineId, patch);
    res.json({ order });
  })
);

/** Admin — remove a line */
app.delete(
  '/api/admin/orders/:id/items/:lineId',
  asyncRoute(async (req, res) => {
    const order = removeOrderItem(req.params.id, req.params.lineId);
    res.json({ order });
  })
);

app.delete(
  '/api/admin/orders/:id',
  asyncRoute(async (req, res) => {
    const { order, restored } = deleteOrder(req.params.id);
    res.json({ ok: true, restored, id: order.id });
  })
);

/* -----------------------------------------------------------
   ADMIN — products (full CRUD)
   ----------------------------------------------------------- */
// Uploads live next to the DB file so a single persistent disk covers both.
// Override with JBD_UPLOAD_DIR if you prefer a different mount.
const UPLOAD_DIR =
  process.env.JBD_UPLOAD_DIR ||
  (process.env.JBD_DB_PATH
    ? path.join(path.dirname(process.env.JBD_DB_PATH), 'uploads')
    : path.join(__dirname, 'data', 'uploads'));
mkdirSync(UPLOAD_DIR, { recursive: true });
const UPLOAD_PUBLIC = '/uploads';
const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB per image (post resize)

app.use(UPLOAD_PUBLIC, express.static(UPLOAD_DIR, { maxAge: '30d', fallthrough: true }));

/** Save a base64 data URL to disk; returns the public path. */
function saveDataUrl(dataUrl, index = 0) {
  const match = /^data:(image\/(jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(String(dataUrl || '').trim());
  if (!match) throw new Error(`Unsupported image format (image #${index + 1}). Use JPG, PNG, WEBP or GIF.`);
  const mime = match[1];
  const ext = ALLOWED_IMAGE_TYPES[mime];
  if (!ext) throw new Error(`Unsupported image type: ${mime}`);
  const buf = Buffer.from(match[3], 'base64');
  if (buf.length === 0) throw new Error(`Empty image data (image #${index + 1}).`);
  if (buf.length > MAX_IMAGE_BYTES) {
    throw new Error(`Image #${index + 1} is too large (${Math.round(buf.length / 1024 / 1024)}MB). Max 8MB.`);
  }
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return `${UPLOAD_PUBLIC}/${name}`;
}

/** Remove an uploaded file if it lives in our upload dir (best effort). */
function removeUploadIfOurs(publicPath) {
  try {
    const name = path.basename(String(publicPath || ''));
    if (!name || !String(publicPath).startsWith(UPLOAD_PUBLIC + '/')) return;
    const target = path.join(UPLOAD_DIR, name);
    if (existsSync(target)) unlinkSync(target);
  } catch {
    /* best effort — never block deletes on file cleanup */
  }
}

/** Admin — upload product images (base64 data URLs, JSON) */
app.post('/api/admin/uploads', requireAdmin, (req, res) => {
  const images = Array.isArray(req.body?.images) ? req.body.images : [];
  if (images.length === 0) return res.status(400).json({ error: 'No images provided.' });
  if (images.length > 8) return res.status(400).json({ error: 'Maximum 8 images per upload.' });
  try {
    const urls = images.map((img, i) => saveDataUrl(img, i));
    res.status(201).json({ urls });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** Admin — create a product */
app.post(
  '/api/admin/products',
  asyncRoute(async (req, res) => {
    const product = createProduct(req.body || {});
    res.status(201).json({ product });
  })
);

/** Admin — list products (search / filter / sort / pagination) */
app.get('/api/admin/products', requireAdmin, (req, res) => {
  const result = listProductsAdmin({
    search: String(req.query.search || '').trim(),
    category: String(req.query.category || 'all').trim(),
    status: String(req.query.status || 'all').trim(),
    sort: String(req.query.sort || 'newest').trim(),
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 12,
  });
  res.json({ ...result, categories: PRODUCT_CATEGORIES });
});

/** Admin — single product */
app.get('/api/admin/products/:slug', requireAdmin, (req, res) => {
  const db = loadDb();
  const product = db.products.find((p) => p.slug === req.params.slug);
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  res.json({ product });
});

/** Admin — full update of a product */
app.patch(
  '/api/admin/products/:slug',
  asyncRoute(async (req, res) => {
    const old = loadDb().products.find((p) => p.slug === req.params.slug);
    const oldImages = old?.images || [];
    const product = updateProduct(req.params.slug, req.body || {});
    // if the admin replaced/removed images, delete files we no longer need
    for (const url of oldImages) {
      if (!product.images.includes(url)) removeUploadIfOurs(url);
    }
    res.json({ product });
  })
);

/** Admin — delete a product (orders keep their item snapshots, never deleted) */
app.delete(
  '/api/admin/products/:slug',
  asyncRoute(async (req, res) => {
    const { product, referencingOrders } = deleteProduct(req.params.slug);
    for (const url of product.images || []) removeUploadIfOurs(url);
    res.json({ ok: true, deleted: product.slug, referencingOrders });
  })
);

/* -----------------------------------------------------------
   ADMIN — messages
   ----------------------------------------------------------- */
app.get('/api/admin/messages', requireAdmin, (req, res) => {
  const db = loadDb();
  const unread = String(req.query.unread || '') === '1';
  let messages = [...db.messages];
  if (unread) messages = messages.filter((m) => !m.read);
  res.json({ messages, total: messages.length, unread: db.messages.filter((m) => !m.read).length });
});

app.patch('/api/admin/messages/:id', requireAdmin, (req, res) => {
  const db = loadDb();
  const msg = db.messages.find((m) => m.id === req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found.' });
  if (req.body?.read !== undefined) msg.read = Boolean(req.body.read);
  persist(db);
  res.json({ message: msg });
});

app.delete('/api/admin/messages/:id', requireAdmin, (req, res) => {
  const db = loadDb();
  const before = db.messages.length;
  db.messages = db.messages.filter((m) => m.id !== req.params.id);
  if (db.messages.length === before) return res.status(404).json({ error: 'Message not found.' });
  persist(db);
  res.json({ ok: true });
});

/* -----------------------------------------------------------
   ADMIN — subscribers + CSV export
   ----------------------------------------------------------- */
app.get('/api/admin/subscribers', requireAdmin, (req, res) => {
  const db = loadDb();
  res.json({ subscribers: db.subscribers, total: db.subscribers.length });
});

app.delete('/api/admin/subscribers/:email', requireAdmin, (req, res) => {
  const db = loadDb();
  const email = String(req.params.email || '').trim().toLowerCase();
  const before = db.subscribers.length;
  db.subscribers = db.subscribers.filter((s) => s.email !== email);
  if (db.subscribers.length === before) return res.status(404).json({ error: 'Subscriber not found.' });
  persist(db);
  res.json({ ok: true });
});

app.get('/api/admin/subscribers.csv', requireAdmin, (req, res) => {
  const db = loadDb();
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [['email', 'subscribed_at']].concat(
    db.subscribers.map((s) => [s.email, new Date(s.createdAt).toISOString()])
  );
  const csv = rows.map((r) => r.map(esc).join(',')).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="subscribers.csv"');
  res.send(csv);
});

/* -----------------------------------------------------------
   Static frontend (production: serves dist/ for SPA)
   ----------------------------------------------------------- */
const distDir = path.join(__dirname, '..', 'dist');
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distDir, 'index.html'));
    }
    next();
  });
}

/* 404 for unknown API routes */
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

/* error handler */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[server] ', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error.' });
});

app.listen(PORT, () => {
  loadDb(); // initialize db.json on boot
  console.log(`[server] Jersey.com.bd API listening on http://localhost:${PORT}`);
  console.log(`[server] Admin panel: http://localhost:${PORT}/admin  (password from ADMIN_PASSWORD)`);
});
