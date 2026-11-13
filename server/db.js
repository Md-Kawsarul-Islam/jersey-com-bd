/**
 * Tiny JSON-file data store.
 * Data lives in server/data/db.json — created from seed on first boot.
 * Writes are atomic (write to tmp file + rename) so a crash can't corrupt the DB.
 *
 * Order lifecycle
 *  status: pending → confirmed → processing → shipped → delivered   (normal flow)
 *          cancelled · refunded                                   (exceptions)
 *  Stock rules:
 *   - Creating an order or adding products to it consumes shelf stock (never negative).
 *   - Moving an order INTO cancelled returns its products to shelf stock (once).
 *   - Leaving cancelled back to an active status consumes stock again (validated).
 *   - Refunded never touches stock (goods already with/lost by the customer).
 *   - Editing products of a cancelled order does not move stock until it is reactivated.
 *   - Deleting a cancelled order does not touch stock (it was already returned);
 *     deleting an active order returns its products to shelf stock.
 */
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = process.env.JBD_DB_PATH || path.join(DATA_DIR, 'db.json');
const SEED_PATH = path.join(__dirname, 'seed-products.json');

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];
const LEGACY_STATUS = { dispatched: 'shipped' };
export const normalizeStatus = (s) => {
  const v = String(s || '').toLowerCase().trim();
  const mapped = LEGACY_STATUS[v] || v;
  return ORDER_STATUSES.includes(mapped) ? mapped : 'pending';
};

export const FREE_DELIVERY_THRESHOLD = () =>
  Number(process.env.JBD_FREE_DELIVERY_THRESHOLD || 2000);
export const DELIVERY_INSIDE_DHAKA = 60;
export const DELIVERY_OUTSIDE_DHAKA = 120;

const newLineId = () => 'L' + crypto.randomBytes(4).toString('hex');
const newOrderId = () =>
  'JBD' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 90 + 10);

function emptyDb() {
  const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'));
  return {
    products: seed,
    orders: [],
    messages: [],
    subscribers: [],
  };
}

let cache = null;

/** Recompute subtotal / discount / originalSubtotal / total. Pure math, no writes. */
function recalcTotals(order) {
  let subtotal = 0;
  let originalSubtotal = 0;
  let discount = 0;
  for (const item of order.items) {
    subtotal += item.price * item.qty;
    const orig = item.originalPrice ?? item.price;
    originalSubtotal += orig * item.qty;
    if (orig > item.price) discount += (orig - item.price) * item.qty;
  }
  const threshold = FREE_DELIVERY_THRESHOLD();
  if (!order.deliveryOverride) {
    order.delivery = subtotal >= threshold ? 0 : order.zone === 'inside' ? DELIVERY_INSIDE_DHAKA : DELIVERY_OUTSIDE_DHAKA;
  }
  order.subtotal = subtotal;
  order.originalSubtotal = originalSubtotal;
  order.discount = discount;
  order.total = subtotal + order.delivery;
  order.updatedAt = Date.now();
  return order;
}

/** Bring any historical order record to the full current shape (in memory). */
function ensureItemShape(item) {
  return {
    lineId: item.lineId || newLineId(),
    slug: item.slug || null,
    name: item.name || 'Unknown product',
    image: item.image || '',
    size: item.size || null,
    qty: Math.max(1, Math.floor(Number(item.qty) || 1)),
    price: Math.max(0, Math.round(Number(item.price) || 0)),
    originalPrice:
      item.originalPrice === null || item.originalPrice === undefined
        ? null
        : Math.max(0, Math.round(Number(item.originalPrice) || 0)),
  };
}

function backfillOrder(raw) {
  if (!raw || !Array.isArray(raw.items)) return raw;
  raw.status = normalizeStatus(raw.status);
  raw.items = raw.items.map(ensureItemShape);
  if (!raw.createdAt) raw.createdAt = Date.now();
  if (typeof raw.stockRestored !== 'boolean') raw.stockRestored = raw.status === 'cancelled';
  if (typeof raw.note !== 'string') raw.note = '';
  // backfill derived totals if missing (legacy rows)
  if (
    typeof raw.subtotal !== 'number' ||
    typeof raw.discount !== 'number' ||
    typeof raw.originalSubtotal !== 'number'
  ) {
    let subtotal = 0, originalSubtotal = 0, discount = 0;
    for (const it of raw.items) {
      subtotal += it.price * it.qty;
      const orig = it.originalPrice ?? it.price;
      originalSubtotal += orig * it.qty;
      if (orig > it.price) discount += (orig - it.price) * it.qty;
    }
    raw.subtotal = subtotal;
    raw.originalSubtotal = originalSubtotal;
    raw.discount = discount;
    if (typeof raw.delivery !== 'number') {
      raw.delivery = subtotal >= FREE_DELIVERY_THRESHOLD() ? 0 : raw.zone === 'inside' ? DELIVERY_INSIDE_DHAKA : DELIVERY_OUTSIDE_DHAKA;
    }
    raw.total = raw.delivery + subtotal;
  }
  return raw;
}

export function loadDb() {
  if (cache) return cache;
  mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DB_PATH)) {
    cache = emptyDb();
    persist(cache);
  } else {
    try {
      cache = JSON.parse(readFileSync(DB_PATH, 'utf8'));
    } catch (err) {
      console.error('[db] Corrupt db.json, re-seeding from scratch:', err.message);
      const backup = DB_PATH + '.corrupt-' + Date.now();
      renameSync(DB_PATH, backup);
      cache = emptyDb();
      persist(cache);
    }
    for (const p of cache.products) backfillProduct(p);
    let dirty = false;
    for (const o of cache.orders) {
      const before = JSON.stringify(o);
      backfillOrder(o);
      if (JSON.stringify(o) !== before) dirty = true;
    }
    if (dirty) persist(cache);
  }
  return cache;
}

export function persist(db = cache) {
  const tmp = DB_PATH + '.tmp';
  writeFileSync(tmp, JSON.stringify(db, null, 1), 'utf8');
  renameSync(tmp, DB_PATH);
}

export function getProducts() {
  return loadDb().products;
}

export function getProductBySlug(slug) {
  return loadDb().products.find((p) => p.slug === slug) || null;
}

export function findOrderById(id) {
  const db = loadDb();
  return db.orders.find((o) => o.id === id) || null;
}

const sumByProduct = (items) => {
  const m = new Map();
  for (const it of items) {
    if (!it.slug) continue;
    m.set(it.slug, (m.get(it.slug) || 0) + it.qty);
  }
  return m;
};

/** Reconcile shelf stock between old and new item lists (absolute safety). */
function reconcileStock(db, { baselineHeld, newItems }) {
  const need = sumByProduct(newItems);
  const touched = new Set([...baselineHeld.keys(), ...need.keys()]);
  for (const slug of touched) {
    const held = baselineHeld.get(slug) || 0;
    const want = need.get(slug) || 0;
    const delta = want - held;
    if (delta === 0) continue;
    const product = db.products.find((p) => p.slug === slug);
    if (!product) {
      const err = new Error(`Unknown product: ${slug}`);
      err.status = 400;
      throw err;
    }
    if (delta > 0) {
      if ((product.stock ?? 0) < delta) {
        const err = new Error(`Not enough stock for: ${product.name} (only ${product.stock ?? 0} left)`);
        err.status = 400;
        throw err;
      }
      product.stock = (product.stock ?? 0) - delta;
    } else {
      product.stock = (product.stock ?? 0) + Math.abs(delta);
    }
  }
}

const restoreItems = (db, items) => {
  for (const it of items) {
    if (!it.slug) continue;
    const product = db.products.find((p) => p.slug === it.slug);
    if (product) product.stock = (product.stock ?? 0) + it.qty;
  }
};

const rowError = (message) => {
  const err = new Error(message);
  err.status = 400;
  return err;
};

const isCustomSlug = (slug) => !slug;

/**
 * Build & validate the item list for create/update.
 * Catalog lines: resolve from the catalog (unless price override given).
 * Custom lines: free-text item with explicit name + price (no stock involvement).
 */
export function buildOrderItems(db, items, { allowDisabled = false } = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw rowError('Add at least one product to the order.');
  }
  const out = [];
  for (const raw of items) {
    const qty = Math.floor(Number(raw.qty) || 0);
    if (qty < 1 || qty > 999) throw rowError('Quantity must be between 1 and 999.');
    const size = raw.size ? String(raw.size).slice(0, 12) : null;

    if (raw.slug) {
      const product = db.products.find((p) => p.slug === String(raw.slug));
      if (!product) throw rowError(`Unknown product: ${raw.slug}`);
      if (!allowDisabled && product.enabled === false) {
        throw rowError(`Product is unavailable: ${product.name}`);
      }
      const price = raw.price !== undefined && raw.price !== null && raw.price !== ''
        ? Math.round(Number(raw.price))
        : product.price;
      if (!Number.isFinite(price) || price < 0) throw rowError(`Invalid price for ${product.name}`);
      out.push({
        lineId: raw.lineId || newLineId(),
        slug: product.slug,
        name: String(raw.name || product.name).slice(0, 300),
        image: product.images?.[0] || '',
        size,
        qty,
        price,
        originalPrice: product.originalPrice ?? null,
      });
    } else {
      // custom line — no catalog product
      const name = String(raw.name || '').trim();
      const price = Math.round(Number(raw.price));
      if (!name) throw rowError('Custom item needs a name.');
      if (!Number.isFinite(price) || price < 0) throw rowError(`Invalid price for "${name}".`);
      out.push({
        lineId: raw.lineId || newLineId(),
        slug: null,
        name: name.slice(0, 300),
        image: '',
        size,
        qty,
        price,
        originalPrice: raw.originalPrice ? Math.round(Number(raw.originalPrice)) : null,
      });
    }
  }
  return out;
}

/**
 * Create an order. Used by both the storefront (public) and the admin panel.
 */
export function createOrder(items, customer, zone, payment, note, { allowDisabled = false, status = 'pending' } = {}) {
  const db = loadDb();
  const built = buildOrderItems(db, items, { allowDisabled });
  const normalizedStatus = normalizeStatus(status);

  const order = {
    id: newOrderId(),
    items: built,
    subtotal: 0,
    originalSubtotal: 0,
    discount: 0,
    delivery: 0,
    total: 0,
    customer,
    zone,
    payment,
    note: note || '',
    status: normalizedStatus,
    stockRestored: false,
    createdAt: Date.now(),
  };

  if (normalizedStatus !== 'cancelled') {
    reconcileStock(db, { baselineHeld: new Map(), newItems: built });
  } else {
    order.stockRestored = true;
  }
  recalcTotals(order);
  db.orders.unshift(order);
  persist(db);
  return order;
}

/**
 * Full update of an order: customer/zone/payment/note/status/delivery/items.
 * Stock is reconciled against what the order currently holds.
 */
export function updateOrder(id, payload = {}) {
  const db = loadDb();
  const order = db.orders.find((o) => o.id === id);
  if (!order) {
    const err = new Error('Order not found.');
    err.status = 404;
    throw err;
  }

  const oldStatus = order.status;
  const oldHeld = order.stockRestored ? new Map() : sumByProduct(order.items);

  // ----- zone / customer / payment / note -----
  if (payload.customer) {
    const { name, phone, address } = payload.customer;
    const cleanName = String(name || '').trim();
    const cleanPhone = String(phone || '').trim();
    const cleanAddress = String(address || '').trim();
    if (cleanName.length < 2) throw rowError('Please enter a valid customer name.');
    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) throw rowError('Enter a valid BD phone number (01XXXXXXXXX).');
    if (cleanAddress.length < 10) throw rowError('Please enter the full delivery address (min 10 characters).');
    order.customer = { name: cleanName, phone: cleanPhone, address: cleanAddress };
  }
  if (payload.zone) {
    if (!['inside', 'outside'].includes(payload.zone)) throw rowError('Invalid delivery zone.');
    order.zone = payload.zone;
  }
  if (payload.payment) {
    if (!['cod', 'bkash', 'nagad'].includes(payload.payment)) throw rowError('Invalid payment method.');
    order.payment = payload.payment;
  }
  if (payload.note !== undefined) order.note = String(payload.note || '').slice(0, 2000);
  if (payload.delivery !== undefined) {
    const d = Number(payload.delivery);
    if (!Number.isFinite(d) || d < 0 || d > 100000) throw rowError('Invalid delivery charge.');
    order.delivery = Math.round(d);
    order.deliveryOverride = true;
  } else if (payload.zone) {
    delete order.deliveryOverride; // zone change → back to automatic
  }

  // ----- status -----
  let newStatus = oldStatus;
  if (payload.status !== undefined) {
    const raw = String(payload.status).toLowerCase().trim();
    if (!ORDER_STATUSES.includes(raw) && raw !== 'dispatched') {
      throw rowError(`Status must be one of: ${ORDER_STATUSES.join(', ')}`);
    }
    newStatus = normalizeStatus(raw);
    order.status = newStatus;
  }

  // ----- items -----
  // While an order is cancelled (stock restored to shelf), item edits move no stock.
  if (payload.items !== undefined) {
    const allowDisabled = true; // admin context — intentional
    const built = buildOrderItems(db, payload.items, { allowDisabled });
    if (!order.stockRestored) {
      reconcileStock(db, { baselineHeld: oldHeld, newItems: built });
    }
    order.items = built;
  }

  // ----- status transitions vs stock -----
  const leavingCancelled = oldStatus === 'cancelled' && newStatus !== 'cancelled';
  const enteringCancelled = oldStatus !== 'cancelled' && newStatus === 'cancelled';

  if (enteringCancelled) {
    // return everything the order currently holds, then mark restored
    restoreItems(db, order.items);
    order.stockRestored = true;
  } else if (leavingCancelled) {
    // re-acquire stock for the full item list (validates availability first)
    reconcileStock(db, { baselineHeld: new Map(), newItems: order.items });
    order.stockRestored = false;
  }

  recalcTotals(order);
  persist(db);
  return order;
}

/** Add a single item (catalog product or custom line) to an order. */
export function addOrderItem(id, itemPayload) {
  const db = loadDb();
  const order = db.orders.find((o) => o.id === id);
  if (!order) {
    const err = new Error('Order not found.');
    err.status = 404;
    throw err;
  }
  if (order.status === 'cancelled') {
    const err = new Error('Order is cancelled — set it back to an active status to change products.');
    err.status = 409;
    throw err;
  }
  const built = buildOrderItems(db, [itemPayload], { allowDisabled: true });
  const line = built[0];
  // stock check + decrement for catalog lines
  if (line.slug) {
    const product = db.products.find((p) => p.slug === line.slug);
    if ((product.stock ?? 0) < line.qty) {
      throw rowError(`Not enough stock for: ${product.name} (only ${product.stock ?? 0} left)`);
    }
    product.stock = (product.stock ?? 0) - line.qty;
  }
  order.items.push(line);
  order.deliveryOverride = order.deliveryOverride; // keep any manual delivery
  recalcTotals(order);
  persist(db);
  return order;
}

/** Patch a single line: qty and/or price and/or name and/or size. */
export function updateOrderItem(id, lineId, patch = {}) {
  const db = loadDb();
  const order = db.orders.find((o) => o.id === id);
  if (!order) {
    const err = new Error('Order not found.');
    err.status = 404;
    throw err;
  }
  if (order.status === 'cancelled') {
    const err = new Error('Order is cancelled — set it back to an active status to change products.');
    err.status = 409;
    throw err;
  }
  const item = order.items.find((i) => i.lineId === lineId);
  if (!item) {
    const err = new Error('Line item not found in this order.');
    err.status = 404;
    throw err;
  }

  if (patch.qty !== undefined) {
    const qty = Math.floor(Number(patch.qty));
    if (!Number.isFinite(qty) || qty < 1 || qty > 999) throw rowError('Quantity must be between 1 and 999.');
    const delta = qty - item.qty;
    if (delta !== 0 && item.slug) {
      const product = db.products.find((p) => p.slug === item.slug);
      if (!product) throw rowError(`Unknown product: ${item.slug}`);
      if (delta > 0) {
        if ((product.stock ?? 0) < delta) {
          throw rowError(`Not enough stock for: ${product.name} (only ${product.stock ?? 0} left)`);
        }
        product.stock -= delta;
      } else {
        product.stock += Math.abs(delta);
      }
    }
    item.qty = qty;
  }
  if (patch.price !== undefined) {
    const price = Number(patch.price);
    if (!Number.isFinite(price) || price < 0 || price > 10000000) throw rowError('Invalid price.');
    item.price = Math.round(price);
  }
  if (patch.name !== undefined) {
    const name = String(patch.name).trim();
    if (!name) throw rowError('Item name cannot be empty.');
    item.name = name.slice(0, 300);
  }
  if (patch.size !== undefined) item.size = patch.size ? String(patch.size).slice(0, 12) : null;

  recalcTotals(order);
  persist(db);
  return order;
}

/** Remove a single line. The order must keep at least one item. */
export function removeOrderItem(id, lineId) {
  const db = loadDb();
  const order = db.orders.find((o) => o.id === id);
  if (!order) {
    const err = new Error('Order not found.');
    err.status = 404;
    throw err;
  }
  if (order.status === 'cancelled') {
    const err = new Error('Order is cancelled — set it back to an active status to change products.');
    err.status = 409;
    throw err;
  }
  if (order.items.length <= 1) {
    const err = new Error('An order needs at least one product. Delete the entire order instead.');
    err.status = 400;
    throw err;
  }
  const item = order.items.find((i) => i.lineId === lineId);
  if (!item) {
    const err = new Error('Line item not found in this order.');
    err.status = 404;
    throw err;
  }
  if (item.slug) {
    const product = db.products.find((p) => p.slug === item.slug);
    if (product) product.stock = (product.stock ?? 0) + item.qty;
  }
  order.items = order.items.filter((i) => i.lineId !== lineId);
  recalcTotals(order);
  persist(db);
  return order;
}

/** Permanently delete an order. Returns its stock unless already restored (cancelled). */
export function deleteOrder(id) {
  const db = loadDb();
  const index = db.orders.findIndex((o) => o.id === id);
  if (index === -1) {
    const err = new Error('Order not found.');
    err.status = 404;
    throw err;
  }
  const [order] = db.orders.splice(index, 1);
  if (!order.stockRestored) restoreItems(db, order.items);
  persist(db);
  return { order, restored: !order.stockRestored };
}

export function findOrdersByQuery(q) {
  const db = loadDb();
  const needle = String(q || '').trim().toLowerCase();
  if (!needle) return [];
  return db.orders.filter(
    (o) =>
      o.id.toLowerCase() === needle ||
      o.customer.phone === needle.replace(/\s/g, '') ||
      o.customer.name.toLowerCase().includes(needle)
  );
}

export { isCustomSlug };

/* ============================================================
   PRODUCT CRUD
   ============================================================ */

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
const CATEGORY_SLUGS = new Set([
  'football-club-jersey', 'half-sleeve-jersey', 'full-sleeve-jersey',
  'football-country-jersey', 'half-sleeve-jersey-2', 'full-sleeve-jersey-2',
  'retro-jerseys', 'national-team-jersey', 'shorts',
]);

export const PRODUCT_CATEGORIES = [...CATEGORY_SLUGS];

const localRowError = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'product';

function backfillProduct(p) {
  if (typeof p.stock !== 'number') p.stock = 50;
  if (typeof p.enabled !== 'boolean') p.enabled = true;
  if (typeof p.featured !== 'boolean') p.featured = false;
  if (typeof p.description !== 'string') p.description = '';
  if (typeof p.subcategory !== 'string') p.subcategory = '';
  if (typeof p.sku !== 'string' || !p.sku.trim()) {
    p.sku = String(p.slug || 'product').toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 40);
  }
  if (!Array.isArray(p.variants)) p.variants = [{ name: 'Size', values: [...DEFAULT_SIZES] }];
  else {
    p.variants = p.variants
      .map((v) => ({
        name: String(v?.name || 'Variant').trim().slice(0, 40) || 'Variant',
        values: (Array.isArray(v?.values) ? v.values : String(v?.values || '').split(','))
          .map((s) => String(s).trim())
          .filter(Boolean)
          .slice(0, 30),
      }))
      .filter((v) => v.values.length > 0);
    if (p.variants.length === 0) p.variants = [{ name: 'Size', values: [...DEFAULT_SIZES] }];
  }
  if (typeof p.createdAt !== 'number') p.createdAt = Date.now();
  return p;
}

function buildProductData(db, body, { creating, existingSlug } = {}) {
  const name = String(body.name || '').trim();
  if (name.length < 4) throw localRowError('Product name must be at least 4 characters.');

  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) throw localRowError('Sale price must be a positive number.');
  let originalPrice = null;
  if (body.originalPrice !== '' && body.originalPrice != null) {
    const o = Number(body.originalPrice);
    if (!Number.isFinite(o) || o < 0) throw localRowError('Regular price must be a valid number.');
    if (o > 0 && o < price) throw localRowError('Regular price should not be lower than the sale price.');
    originalPrice = Math.round(o);
  }

  const stock = Number(body.stock);
  if (!Number.isInteger(stock) || stock < 0 || stock > 100000) {
    throw localRowError('Stock must be a whole number between 0 and 100,000.');
  }

  const sku = String(body.sku || '').trim().toUpperCase();
  if (sku.length < 2) throw localRowError('SKU must be at least 2 characters.');
  for (const p of db.products) {
    if (p.sku === sku && p.slug !== existingSlug) {
      throw localRowError(`SKU already in use: ${sku}`, 409);
    }
  }

  const images = Array.isArray(body.images)
    ? body.images.filter((u) => typeof u === 'string' && u.trim().length > 3)
    : [];
  if (images.length === 0) throw localRowError('Add at least one product image.');
  if (images.length > 8) throw localRowError('Maximum 8 images per product.');

  const category = String(body.category || '').trim();
  if (!CATEGORY_SLUGS.has(category)) throw localRowError('Choose a valid category.');
  const subcategory = String(body.subcategory || '').trim().slice(0, 80);
  const description = String(body.description || '').trim().slice(0, 5000);

  let variants = Array.isArray(body.variants) ? body.variants : [{ name: 'Size', values: [...DEFAULT_SIZES] }];
  variants = variants
    .map((v) => ({
      name: String(v?.name || 'Variant').trim().slice(0, 40) || 'Variant',
      values: (Array.isArray(v?.values) ? v.values : String(v?.values || '').split(','))
        .map((s) => String(s).trim())
        .filter(Boolean)
        .slice(0, 30),
    }))
    .filter((v) => v.values.length > 0);
  if (variants.length === 0) variants = [{ name: 'Size', values: [...DEFAULT_SIZES] }];

  let discount = null;
  if (originalPrice && originalPrice > price) {
    discount = Math.round(100 - (price / originalPrice) * 100);
    if (discount <= 0) discount = 1;
  }

  const data = {
    name,
    description,
    sku,
    price: Math.round(price),
    originalPrice,
    discount,
    images,
    categories: [category],
    subcategory,
    stock,
    enabled: body.enabled !== false,
    featured: Boolean(body.featured),
    variants,
    createdAt: Date.now(),
  };

  if (creating) {
    const base = slugify(name);
    let slug = base;
    let n = 2;
    while (db.products.some((p) => p.slug === slug)) slug = `${base}-${n++}`;
    data.slug = slug;
    return data;
  }
  data.slug = existingSlug;
  return data;
}

/** Admin catalog list with search/filter/sort/pagination. */
export function listProductsAdmin({ search = '', category = 'all', status = 'all', sort = 'newest', page = 1, limit = 12 } = {}) {
  const db = loadDb();
  let products = [...db.products];
  const tokens = String(search).toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length) {
    products = products.filter((p) => {
      const hay = `${p.name} ${p.slug} ${p.sku} ${(p.categories || []).join(' ')} ${p.subcategory || ''} ${p.description || ''}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }
  if (category && category !== 'all') {
    products = products.filter((p) => (p.categories || []).includes(category));
  }
  if (status === 'active') products = products.filter((p) => p.enabled !== false);
  else if (status === 'inactive') products = products.filter((p) => p.enabled === false);

  switch (sort) {
    case 'name-asc': products.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'price-asc': products.sort((a, b) => a.price - b.price); break;
    case 'price-desc': products.sort((a, b) => b.price - a.price); break;
    case 'stock-asc': products.sort((a, b) => a.stock - b.stock); break;
    case 'stock-desc': products.sort((a, b) => b.stock - a.stock); break;
    case 'oldest': products.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); break;
    case 'newest':
    default: products.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); break;
  }

  const total = products.length;
  const limitNum = Math.max(1, Math.min(50, Number(limit) || 12));
  const pages = Math.max(1, Math.ceil(total / limitNum));
  const pageNum = Math.min(Math.max(1, Number(page) || 1), pages);
  const items = products.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  return { products: items, total, page: pageNum, pages, limit: limitNum };
}

export function createProduct(body) {
  const db = loadDb();
  const data = buildProductData(db, body, { creating: true });
  db.products.unshift(data);
  persist(db);
  return data;
}

export function updateProduct(slug, body) {
  const db = loadDb();
  const product = db.products.find((p) => p.slug === slug);
  if (!product) throw localRowError('Product not found.', 404);

  // Full-form save (name + price + images + category present) → complete rebuild/validate.
  const looksComplete = ['name', 'price', 'images', 'category'].every((k) => body[k] !== undefined);
  if (looksComplete) {
    const data = buildProductData(db, body, { creating: false, existingSlug: slug });
    const createdAt = product.createdAt;
    Object.assign(product, data, { createdAt });
    persist(db);
    return product;
  }

  // Partial update — apply only the provided fields, each validated (keeps the
  // quick admin toggles { price }, { stock }, { enabled }, { featured }, … fast).
  const prevImages = product.images || [];
  const prevPrice = product.price;
  const prevOriginal = product.originalPrice;
  let dirty = false;

  if (body.price !== undefined) {
    const n = Number(body.price);
    if (!Number.isFinite(n) || n <= 0) throw localRowError('Sale price must be a positive number.');
    product.price = Math.round(n);
    dirty = true;
  }
  if (body.originalPrice !== undefined) {
    if (body.originalPrice === null || body.originalPrice === '') {
      product.originalPrice = null;
    } else {
      const n = Number(body.originalPrice);
      if (!Number.isFinite(n) || n < 0) throw localRowError('Regular price must be a valid number.');
      if (n > 0 && n < product.price) throw localRowError('Regular price should not be lower than the sale price.');
      product.originalPrice = Math.round(n);
    }
    dirty = true;
  }
  if (body.discount !== undefined) {
    if (body.discount === null) product.discount = null;
    else {
      const n = Number(body.discount);
      if (!Number.isFinite(n) || n < 0 || n > 99) throw localRowError('Discount must be 0–99.');
      product.discount = Math.round(n);
    }
    dirty = true;
  }
  if (body.stock !== undefined) {
    const n = Number(body.stock);
    if (!Number.isInteger(n) || n < 0 || n > 100000) throw localRowError('Stock must be a whole number ≥ 0.');
    product.stock = n;
    dirty = true;
  }
  if (body.enabled !== undefined) { product.enabled = Boolean(body.enabled); dirty = true; }
  if (body.featured !== undefined) { product.featured = Boolean(body.featured); dirty = true; }
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 4) throw localRowError('Product name must be at least 4 characters.');
    product.name = name.slice(0, 300);
    dirty = true;
  }
  if (body.sku !== undefined) {
    const sku = String(body.sku).trim().toUpperCase();
    if (sku.length < 2) throw localRowError('SKU must be at least 2 characters.');
    for (const p of db.products) {
      if (p.sku === sku && p.slug !== product.slug) throw localRowError(`SKU already in use: ${sku}`, 409);
    }
    product.sku = sku;
    dirty = true;
  }
  if (body.category !== undefined) {
    const category = String(body.category).trim();
    if (!CATEGORY_SLUGS.has(category)) throw localRowError('Choose a valid category.');
    product.categories = [category];
    dirty = true;
  }
  if (body.subcategory !== undefined) { product.subcategory = String(body.subcategory).trim().slice(0, 80); dirty = true; }
  if (body.description !== undefined) { product.description = String(body.description).trim().slice(0, 5000); dirty = true; }
  if (body.variants !== undefined) {
    let variants = Array.isArray(body.variants) ? body.variants : [];
    variants = variants
      .map((v) => ({
        name: String(v?.name || 'Variant').trim().slice(0, 40) || 'Variant',
        values: (Array.isArray(v?.values) ? v.values : String(v?.values || '').split(','))
          .map((s) => String(s).trim())
          .filter(Boolean)
          .slice(0, 30),
      }))
      .filter((v) => v.values.length > 0);
    product.variants = variants.length ? variants : [{ name: 'Size', values: [...DEFAULT_SIZES] }];
    dirty = true;
  }
  if (body.images !== undefined) {
    const images = Array.isArray(body.images)
      ? body.images.filter((u) => typeof u === 'string' && u.trim().length > 3)
      : [];
    if (images.length === 0) throw localRowError('Add at least one product image.');
    if (images.length > 8) throw localRowError('Maximum 8 images per product.');
    product.images = images;
    dirty = true;
  }

  // recompute discount if pricing moved and caller didn't pin one explicitly
  if (dirty && body.discount === undefined) {
    const orig = product.originalPrice;
    product.discount = orig && orig > product.price ? Math.round(100 - (product.price / orig) * 100) : null;
    if (product.discount !== null && product.discount <= 0) product.discount = 1;
  }

  if (dirty) persist(db);
  return product;
}

export function deleteProduct(slug) {
  const db = loadDb();
  const index = db.products.findIndex((p) => p.slug === slug);
  if (index === -1) throw localRowError('Product not found.', 404);
  const [product] = db.products.splice(index, 1);
  const referencingOrders = db.orders.filter((o) => (o.items || []).some((i) => i.slug === slug)).length;
  persist(db);
  return { product, referencingOrders };
}
