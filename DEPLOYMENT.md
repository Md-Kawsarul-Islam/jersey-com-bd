# Deploying Jersey.com.bd to production (Render + GitHub)

This project is a **single Node web service** (Express serves both the REST API and the built React storefront) plus a **persistent disk** for its JSON database and uploaded product images. No external database or storage account is required.

Estimated time: ~30–45 minutes, most of it waiting for Render to build.

---

## What you will need

1. A **Render** account — https://render.com (sign up with your existing GitHub account; free to create)
2. A **GitHub** account (with this repo pushed to it)
3. (Optional) DNS access to the domain you want, e.g. `jersey.com.bd`, at your registrar or Cloudflare
4. ~US **$7/month** for Render’s Starter plan — required for the **persistent disk** (the free tier has an *ephemeral* filesystem: every redeploy or restart wipes your orders, messages and uploads. Do not use the free plan for a live store.)

> You never paste passwords or API keys into chat, and neither does this guide ask you to. Secrets are entered directly in the Render dashboard.

---

## Step 1 — Push the code to GitHub

If you haven’t already, create a **private** repository (no README, no .gitignore — the project already has both):

1. Open https://github.com/new
2. Name: `jersey-com-bd` (or whatever you like)
3. Visibility: **Private**
4. Do **not** check “Add a README” / “.gitignore” (nothing to merge, this repo is complete)
5. Click **Create repository**

Then, in a terminal on this PC:

```bash
cd "D:\Website\jersey-com-bd"
git remote add origin https://github.com/<your-username>/jersey-com-bd.git
git push -u origin main
```

The first push will open a **browser window** for GitHub sign-in (Git Credential Manager). Sign in with the same account — no password is typed in the terminal.

> If you used a repo created above with a different name, substitute the URL.

---

## Step 2 — Create the web service on Render

1. Go to https://dashboard.render.com → sign in with GitHub
2. Click **New +** → **Blueprint** (the file `render.yaml` in this repo is already configured)
3. Click **Connect GitHub account** → authorize Render to see the `jersey-com-bd` repo → pick it
4. Render reads `render.yaml` and shows one service: `jersey-com-bd` (Starter, Node, $7/mo, 10 GB disk)
5. Click **Apply**
6. Render now asks for the values marked “sync: false” — set **`ADMIN_PASSWORD`** to a strong secret of your choice (12+ characters, mix of letters/numbers/symbols). This is the password for `/admin`.
7. Click **Apply** / **Create** — the deploy begins (build takes ~2–5 min: `npm install` + `npm run build`)

Meanwhile, watch **Logs**: you should see `npm install`, `vite build`, then:

```
[server] Jersey.com.bd API listening on http://localhost:10000
```

Render sets `PORT` automatically; the app reads it. The health check (`/api/health`) must return 200 — Render marks the deploy live when it does.

---

## Step 3 — Smoke-check your live site

Open your new URL, e.g. `https://jersey-com-bd.onrender.com`:

- [ ] Home loads with products
- [ ] Search works (e.g. “real madrid”)
- [ ] Add to cart → checkout as “Cash on Delivery” (use your own test phone/address)
- [ ] `https://jersey-com-bd.onrender.com/admin` — log in with the **ADMIN_PASSWORD you set in the dashboard**
- [ ] You see the test order you just placed
- [ ] Delete that test order from the admin
- [ ] `https://jersey-com-bd.onrender.com/api/health` returns `{"ok":true}`

---

## Step 4 — Seed your real catalog (optional)

On first boot with an empty disk, the code seeds the 50 reference products from `server/seed-products.json`. If you want to push a specific `server/data/db.json` instead (e.g. one containing products you edited locally):

Render → your service → **Shell** tab →

```bash
# db.json is NOT in git (it's git-ignored on purpose — user/orders data)
# Easiest: curl it onto the disk via the Render shell, or re-apply edits in the admin UI.
```

Or simply manage products through the admin UI (`/admin/products`) — everything is editable there and persisted on the disk.

---

## Step 5 — Custom domain (optional)

1. Render dashboard → your service → **Settings** → **Custom Domains**
2. Add `jersey.com.bd` (and `www.jersey.com.bd` if you want both)
3. At your registrar (or Cloudflare), add the CNAME records Render shows you (typically `jersey.com.bd` → `<your-service>.onrender.com`, via CNAME/ALIAS)
4. Wait for DNS to propagate (minutes to 24 h). HTTPS is issued automatically by Render (Let’s Encrypt) — nothing else to do.

---

## Step 6 — Verify production data is safe

- The **disk** is mounted at `/persist/data` and holds `db.json` (orders/products/messages/subscribers) and `uploads/` (product images).
- They **do not** reset on redeploy or restart.
- Render takes snapshots of the disk? Not automatically — set up your own backups:
  - Weekly: download `db.json` via Shell (`cat /persist/data/db.json`) or copy it off in the Render dashboard.
  - Or add a cron job / scheduled task.

### What “preserve existing data” means here

Your local `server/data/db.json` was **never** touched — it contains your 0 orders/messages/subscribers and the 50-product catalog. A timestamped backup was made at `backups/db-20261113-175216.json` and is git-ignored. Your live database starts as the seed catalog; anything you do locally is not automatically pushed to production.

---

## Phase 6 — Full functionality test matrix

Run through these after every deploy (all must pass):

| Test | Route / action | Expected |
|---|---|---|
| Storefront loads | `/` | Products render |
| Registration | `/register` | Account created (device-local demo) |
| Admin login | `/admin` with your `ADMIN_PASSWORD` | Dashboard opens |
| Admin login rate-limit | `/admin` with wrong password ×11 | 429 “Too many attempts” |
| Add product | `/admin/products` → Add New Product → upload image → save | Product appears on storefront |
| Edit product price/stock | same → edit → save | Storefront shows new price |
| Product image upload | same | Images load on storefront |
| Cart / checkout COD | `/shop` → Order Now → checkout | Order placed, stock decremented |
| Order visible in admin | `/admin/orders` | Order listed, status changeable |
| Status transitions | `/admin/orders` → change status | Track page reflects status |
| PDF receipt | `/admin/orders` → download icon | `Receipt-<id>.pdf` downloads |
| Mobile layout | Resize to 390px | Sticky bottom bar, grids collapse |

---

## Future updates

```bash
cd "D:\Website\jersey-com-bd"
# make your changes, then:
git add -A
git commit -m "your message"
git push
```

Render sees the push → rebuilds → redeploys automatically (about 2–5 min per deploy). Zero-downtime: the old instance keeps serving until the new one passes `/api/health`.

### Rolling back

Render dashboard → your service → **Events** → click an older successful deploy → **Rollback**. (Disk data is unaffected — it persists across rollbacks.)

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Build fails at `npm run build` | Dependency or Node version issue | Check Logs; locally run `npm install && npm run build` — same commands |
| Deploy live but `/api/health` fails | Wrong `startCommand` or crashed process | Logs; confirm `npm start` works locally |
| Orders/images disappear after deploy | Free plan (ephemeral disk) | Upgrade to Starter plan — disk persists |
| 429 on admin login | Rate limiter (10/15min per IP) | Wait 15 min or check you didn’t mistype |
| 500 on admin login | `ADMIN_PASSWORD` mismatch between dashboard and expectation | Set/reset in Render dashboard → Environment → save |
| Uploaded images 404 | Disk not mounted or `/persist/data` not used | Verify disk exists in dashboard → Settings; check `JBD_DB_PATH` value |
| Storefront shows stale catalog after deploy | Browser cache | Hard refresh; the catalog API is also refreshed on focus |

---

## Security checklist (production)

- [x] `NODE_ENV=production` — Express trusts the proxy (correct IPs for rate limiting)
- [x] Server **refuses to boot** without `ADMIN_PASSWORD`
- [x] Admin login rate-limited: 10 attempts / 15 min per IP
- [x] Orders rate-limited: 30 per hour per IP
- [x] Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
- [x] `x-powered-by` disabled
- [x] JSON body limit 1 MB; uploads limited to 8 MB each, 8 per product, type-checked
- [x] `db.json` and `uploads/` are on the persistent disk and not in git
- [x] Only admin Bearer tokens can reach `/api/admin/*` (12 h expiry)
- [x] HTTPS terminated by Render (Let’s Encrypt) with auto-renewal

---

## URLs you will have

| What | URL |
|---|---|
| Storefront | `https://jersey-com-bd.onrender.com` (or your custom domain) |
| Admin dashboard | `https://jersey-com-bd.onrender.com/admin` |
| API health check | `https://jersey-com-bd.onrender.com/api/health` |
| Render dashboard | `https://dashboard.render.com` |
