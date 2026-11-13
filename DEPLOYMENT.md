# Deploying Jersey.com.bd to Render (Free Web Service)

This guide deploys the site as a **single Render Free Web Service** — storefront + admin + API — with no database service and no payment information required. About 15–30 minutes.

---

## What you need

1. A **Render** account — https://render.com (sign in with GitHub)
2. This GitHub repository pushed to your account (e.g. `github.com/<you>/jersey-com-bd`)
3. That’s it — no credit card, no paid services

> Secrets (your `ADMIN_PASSWORD`) are entered in the Render dashboard — never typed into chat and never committed to the repo.

---

## Phase A — inspect what Render will run

| Item | Value |
|---|---|
| Framework | React 19 + Vite 8 (frontend, pre-built into `dist/`) |
| Backend | Node.js 20+ / Express 5 — entry point `server/index.js` |
| Database | JSON file on disk, seeded from `server/seed-products.json` on first boot (50 products, zero configuration) |
| Start command | `npm start` → `node server/index.js` |
| Build command | `npm install && npm run build` |
| Health check | `GET /api/health` → `{"ok":true}` |

---

## Phase B — step-by-step deployment

1. Open **https://dashboard.render.com** → sign in with GitHub
2. Click **New +** (top-right) → **Web Service**
3. Under “Connect a repository”, find your `jersey-com-bd` repo → click **Connect**
   - If you don’t see it: click **Configure account** and grant Render access to that repo (or all repos)
4. Fill in the form:

   | Field | Enter |
   |---|---|
   | Name | `jersey` — the URL becomes `https://jersey.onrender.com` |
   | Region | `Singapore` (closest to Bangladesh; picked at creation) |
   | Branch | `main` |
   | Runtime | `Node` |
   | Build Command | `npm install && npm run build` (or `npm install --include=dev && npm run build`) |
   | Start Command | `npm start` |
   | Instance Type | **Free** ($0/month) — do NOT pick anything marked $ |

5. Expand **Environment Variables** → click **Add Environment Variable**:

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `ADMIN_PASSWORD` | A strong password you choose (12+ chars) — this guards the `/admin` panel. The server refuses to boot without it. |

   Optional:

   | Key | Value |
   |---|---|
   | `JBD_FREE_DELIVERY_THRESHOLD` | `2000` (already the default — skip unless you want to change free-delivery threshold) |

6. Click **Create Web Service**
7. Watch the **Logs** tab. Expect:
   ```
   $ npm install   → added ~120 packages
   $ npm run build → vite build … dist/ created
   [server] Jersey.com.bd API listening on http://0.0.0.0:10000
   ```
   The first deploy typically takes 3–6 minutes. Render marks it **Live** (green) when `/api/health` returns 200 — usually 10–60 seconds after the server starts.

8. Open your URL: **https://jersey.onrender.com**
   - Storefront should load with all 50 products
   - `/api/health` → `{"ok":true,…}`
   - `/admin` → login with the `ADMIN_PASSWORD` you set in step 5

---

## Phase C — verify it works

| Test | Where | Expected |
|---|---|---|
| Catalog loads | `/` | 50 products with images |
| Search | Search bar → “real madrid” | results |
| Cart → checkout | Order Now → form → COD | success page with Order ID |
| Order in admin | `/admin/orders` | order visible, status changeable |
| Admin login | `/admin` | dashboard opens |
| Login rate-limit | `/admin` × 11 wrong passwords | “Too many attempts” |

---

## Important — what Free plan means for your data

Render’s Free web service has an **ephemeral filesystem**:

- `server/data/db.json` is **re-seeded from `server/seed-products.json` on every cold start/redeploy**
- Your 50 seed products always come back ✓
- **Lost on redeploy/restart:** orders placed by customers, messages, newsletter subscribers, any admin edits to products, and uploaded product images
- Uploads stored via `/admin/products` also disappear
- No persistent disk and no free managed database are available on the Free plan

Since the store currently has **zero orders/messages/subscribers**, nothing real is lost today. Customer orders placed after launch **will vanish on every redeploy** — treat it as a demo/staging environment until you’re ready for persistence.

### Free persistence options (any can be added later, at zero cost)

| Option | How it works | Limitations |
|---|---|---|
| **Firebase Realtime Database** (Spark plan, free) | `db.js` swapped to read/write the DB over the Firebase REST API; images → Firebase Storage (free 1 GB) | Needs a Firebase project + service-account JSON as env vars in Render (secrets in dashboard, never in repo). ~1–2 h to implement. |
| **Supabase** (Free Postgres) | Same idea — normalize tables into Supabase Postgres | Bigger rewrite (~½ day). 500 MB DB limit is plenty. |
| **Render Starter** ($7/mo + 10 GB disk) | What this project supports out of the box | Not free; keeps current code unchanged; 10 GB covers catalog + uploads for years |
| **Cloudflare R2 + D1** | Images to R2, DB rows to D1 | Most rewrite; overkill for this catalog |

If you want real persistence on the free tier, the **Firebase** route is the lightest. Say the word and I’ll wire it up (you create the Firebase project; you paste nothing — secrets go into Render’s Environment dashboard).

---

## Phase D — custom domain (jersey.com.bd)

1. Render dashboard → your service → **Settings** → scroll to **Custom Domains** → **Add Custom Domain** → enter `jersey.com.bd`
2. Render shows a CNAME/ALIAS target like `jersey.onrender.com`
3. At your domain registrar (or Cloudflare):
   - Add a **CNAME** record: name `@` (or `jersey.com.bd`) → value `jersey.onrender.com`
   - If your DNS provider doesn’t support CNAME at the root, use an **ALIAS/ANAME** record, or move DNS to Cloudflare (free) and use a CNAME flattened at root
   - Add `www` CNAME → same target if you want `www.jersey.com.bd` too
4. Wait for propagation (minutes to 24 h). Render auto-issues HTTPS via Let’s Encrypt — nothing to click.
5. Verify: https://jersey.com.bd loads the store; the admin is at https://jersey.com.bd/admin

---

## Phase E — future updates

```bash
cd "D:\Website\jersey-com-bd"
git add -A
git commit -m "describe your change"
git push
```

Render redeploys automatically on push to `main` (auto-deploy is on by default). ~3–6 min per deploy; the store shows the seed catalog again afterward (orders/messages/uploads reset) — see the “Important” section above.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Build fails at `npm run build` | Run `npm install && npm run build` locally to see the real error; check Node version ≥ 20 |
| Deploy shows “Build successful” but site 502/503 | Check Logs for a crash — most often `ADMIN_PASSWORD` missing in Environment. Server refuses to boot without it. |
| `/admin` logs “Invalid admin password” | The password in Render env is the one you typed at creation — it is case-sensitive |
| Orders vanish after deploy | Expected on the Free plan (ephemeral FS). See “Important” above |
| Images in `/uploads/` 404 after deploy | Same reason — uploads are ephemeral. Use Firebase Storage for permanent images |
| Rate limit says “Too many attempts” | 10 failed logins / 15 min per IP — wait or use correct password |
