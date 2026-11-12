# Sharon Contactless Multi-Outlet QR Ordering — Phase 8 Deployment Guide

> **Decoupled Infrastructure**: This platform runs on its own EC2 instance and its own PostgreSQL database (`sharon_contactless_db`), completely isolated from the main `www.sharonteastall.com` database.

---

## 1. Dedicated PostgreSQL Setup (Strict UTC)

1. Provision PostgreSQL 15+ (`sharon_contactless_db`) with server timezone set to UTC:
   ```sql
   CREATE DATABASE sharon_contactless_db;
   ALTER DATABASE sharon_contactless_db SET timezone TO 'UTC';
   ```
2. Apply the clean single-page production schema:
   ```bash
   psql "$DATABASE_URL" -f services/contactless-api/src/database/schema.production.sql
   ```
   *(Or via workspace script after configuring `.env`: `pnpm --filter @sharon/contactless-api db:init:prod`.)*
3. Run the production-safe reference seed (modifiers, snacks, MD account from `MD_SEED_EMAIL` / `MD_SEED_PASSWORD`):
   ```bash
   NODE_ENV=production pnpm --filter @sharon/contactless-api seed
   ```
   > **Note**: `dev.seed.ts` is strictly blocked when `NODE_ENV !== 'development'`.

---

## 2. Backend Deployment (`services/contactless-api` on EC2)

1. Configure `/var/www/sharon-contactless-ordering/.env` from `.env.example`:
   - `NODE_ENV=production`
   - `PORT=4100`
   - `DATABASE_URL=postgresql://...`
   - `JWT_SECRET=<min 32 random chars>`
   - `CORS_ALLOWED_ORIGINS=https://order.sharonteastall.com,https://dashboard.sharonteastall.com`
   - `MAIN_WEBSITE_API_URL=https://api.sharonteastall.com/api/v1/Product/GetPublicProducts`
   - `PAYMENT_ACTIVE_PROVIDER=DEMO_UPI_INTENT` (switch to `RAZORPAY` or `CASHFREE` + webhook secrets when ready)
2. Install & build monorepo workspaces:
   ```bash
   pnpm install --frozen-lockfile
   pnpm --filter @sharon/shared build
   pnpm --filter @sharon/contactless-api build
   ```
3. Start with PM2 (keep `instances: 1` for in-memory Socket.io rooms, or attach `@socket.io/redis-adapter` before scaling horizontally):
   ```bash
   pm2 start infra/pm2/ecosystem.config.cjs
   pm2 save
   ```
4. Configure Nginx using `infra/nginx/contactless-api.conf`:
   ```bash
   sudo cp infra/nginx/contactless-api.conf /etc/nginx/sites-available/contactless-api.conf
   sudo ln -s /etc/nginx/sites-available/contactless-api.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d contactless-api.sharonteastall.com
   ```

---

## 3. Frontend Static Hosting (`S3 + CloudFront`)

- **Customer PWA (`apps/order`)** → `https://order.sharonteastall.com`
  - Build with `VITE_API_BASE_URL=https://contactless-api.sharonteastall.com/api/v1` and `VITE_SOCKET_URL=https://contactless-api.sharonteastall.com`.
  - Configure CloudFront custom error responses (`403` / `404` → `/index.html` with `200`) for SPA routing.
- **Operations & KDS Portal (`apps/dashboard`)** → `https://dashboard.sharonteastall.com`
  - Same `VITE_API_BASE_URL` and `VITE_SOCKET_URL` build env vars + CloudFront SPA fallback.

---

## 4. Live Small-Shop Pilot Verification Checklist

1. Log in as MD on `https://dashboard.sharonteastall.com`, open **Menu Sync**, and click **Sync Menus from Website** (pulls 55 beverages + S3 images from `api.sharonteastall.com`).
2. Confirm Indiranagar outlet UPI config (`paytm.s211ne7@pty`, `MUNISWAMY JOSHVA`, `DEMO_UPI_INTENT`) and generate a counter QR standee in **QR Master**.
3. Open **KDS** on counter tablet/laptop; confirm WebSocket indicator is connected and sound chime is unmuted.
4. Scan QR on customer mobile → add beverage + modifier + Osmania Biscuit → submit → verify `upi://pay` URI and Dynamic QR render server-computed total.
5. Complete ₹1/₹20 test payment or click "I Have Paid" → confirm 3s notification → confirm KDS chimes immediately with `UPI_CLAIMED_DEMO`.
6. Click **Verify Payment & Brew** → confirm customer phone live tracker updates via Socket.io without refresh and displays IST timestamps (`Asia/Kolkata`).
7. Toggle an item **Sold Out** in Stock Control → confirm customer menu reflects **Sold Out** immediately and checkout returns `409` if tampered.
