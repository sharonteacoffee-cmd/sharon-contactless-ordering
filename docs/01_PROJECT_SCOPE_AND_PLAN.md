# 01 — Project Scope & Master Development Plan

## 1. Project Overview & Goals

Build a standalone, decoupled **Contactless QR Dine-in & Counter Takeaway Ordering Platform** for **Sharon Tea & Coffee** across multiple outlets (Indiranagar Flagship, New Thippasandra, Kaggadasapura, and future branches).

This platform runs on **separate infrastructure** (dedicated EC2 backend + dedicated PostgreSQL database) and communicates with the main corporate website (`https://api.sharonteastall.com`) exclusively via REST API sync.

### Production Subdomains
| Application | Subdomain | Users | Tech Stack |
| :--- | :--- | :--- | :--- |
| **Customer Contactless PWA** | `https://order.sharonteastall.com` | Walk-in / Dine-in Customers | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand, Socket.io-client *(UI designed via Stitch AI)* |
| **Operations & KDS Portal** | `https://dashboard.sharonteastall.com` | Managing Director (MD) & Outlet Staff | React 18, TypeScript, Vite, Ant Design, Tailwind CSS, TanStack Query, Zustand, Socket.io-client |
| **Contactless API & Socket Server** | Dedicated API subdomain (e.g. `https://order-api.sharonteastall.com`) | Serves `order` & `dashboard` | Node.js 20, Express 4, TypeScript, Socket.io, Zod, Argon2, JWT, PostgreSQL (`pg`) |

---

## 2. Recommended Standalone Folder Structure

```text
sharon-contactless-ordering/ (D:\LOTUS\contactless_order)
├── .agents/rules/contactless-standards.md
├── AGENTS.md
├── GEMINI.md
├── apps/
│   ├── order/                          # Customer PWA -> order.sharonteastall.com
│   │   ├── src/
│   │   │   ├── api/                    # Axios public client + interceptors
│   │   │   ├── components/             # OutletHeader, MenuGrid, ItemModifierModal, UpsellTray, UpiPayCard
│   │   │   ├── hooks/                  # TanStack Query hooks (useOutletMenu, useTrackOrder)
│   │   │   ├── pages/                  # OutletOrderPage, OrderStatusPage
│   │   │   ├── stores/                 # Zustand client-only stores (useCartStore, useUiStore)
│   │   │   ├── socket/                 # Socket.io customer room client
│   │   │   └── utils/                  # Formatters, UPI URI helpers
│   │   └── package.json
│   │
│   └── dashboard/                      # MD & Outlet Staff Portal -> dashboard.sharonteastall.com
│       ├── src/
│       │   ├── api/                    # Axios authenticated client + JWT refresh
│       │   ├── components/             # KdsBoard, OrderCard, QrStandeePreview, StockSwitchRow
│       │   ├── hooks/                  # TanStack Query hooks (useLiveOrders, useOutletStock)
│       │   ├── layouts/                # Role-aware layout (MD switcher vs. locked Staff branch)
│       │   ├── pages/                  # LoginPage, LiveOrdersKdsPage, StockControlPage, QrMasterPage, MenuSyncPage, OutletsMasterPage
│       │   ├── stores/                 # Zustand auth & sound mute UI state
│       │   └── socket/                 # Socket.io staff/admin listener + audio chime trigger
│       └── package.json
│
├── services/
│   └── contactless-api/                # Dedicated EC2 Backend + Socket.io Server
│       ├── src/
│       │   ├── config/                 # Zod-validated env config
│       │   ├── database/               # schema.production.sql + schema.development.sql (single-page parity), pg Pool UTC
│       │   ├── seed/                   # reference.seed.ts (prod-safe) & dev.seed.ts (dev-only)
│       │   ├── middleware/             # JWT auth, RBAC (MD/OUTLET_STAFF), IDOR guard, rate limiters, Zod validate
│       │   ├── modules/
│       │   │   ├── public/             # Sanitized Public APIs (outlet, menu, order create, demo-pay, track)
│       │   │   ├── private/            # Authenticated APIs (auth, orders/KDS, stock, QR master, menu sync, outlets)
│       │   │   └── payment/            # Pluggable Payment Adapter (DEMO_UPI_INTENT | RAZORPAY | CASHFREE)
│       │   ├── socket/                 # Socket.io server & room isolation (outlet_{id}, order_{id}, admin:all)
│       │   ├── app.ts
│       │   └── server.ts
│       └── package.json
│
├── packages/
│   └── shared/                         # Shared Types, Zod Schemas & UTC<->IST Date Utilities
│       ├── src/
│       │   ├── types/
│       │   ├── schemas/
│       │   └── utils/date.ts           # Canonical UTC -> Dynamic User Timezone (IST) & elapsed seconds
│       └── package.json
│
├── docs/                               # Project Blueprints & Rules
├── pnpm-workspace.yaml
└── package.json
```

---

## 3. Complete Project Scope

### A. In-Scope Deliverables

1. **Multi-Outlet QR Code Master**:
   - Unique QR tokens per outlet (and optional table/counter label) pointing to `https://order.sharonteastall.com/order/:outletSlug?qr=:qrToken`.
   - Landing page clearly renders branch name, address, and live status.
   - Regenerate or disable old/compromised QR codes (`is_active = false`), plus printable branded standee export (PNG/PDF).
2. **Decoupled Menu Sync from Main Website (REST API)**:
   - MD-only **"Sync Menus from Website"** button pulls from `https://api.sharonteastall.com/api/v1/Product/GetPublicProducts` (55 official items, categories, prices, S3 images) and upserts into the Contactless DB without DB coupling.
3. **Outlet-Specific Menus & Real-Time Stock Control**:
   - Branch-scoped availability (`In Stock` / `Sold Out`) and custom price override (`outlet_menu_items`).
   - Socket.io broadcasts `outlet:stock_changed` instantaneously to active customers at that branch.
4. **Beverage Modifiers & Pre-Checkout Upsell Tray**:
   - Sugar Level (*Normal*, *Less Sugar*, *No Sugar*, *Organic Jaggery +₹5*), Brew Strength (*Standard*, *Kadak*, *Extra Ginger +₹5*, *Crushed Elaichi +₹5*), special instructions.
   - Pre-checkout pairing tray (*Osmania Butter Biscuit ₹10*, *Bun Maska ₹35*, *Samosa ₹20*).
5. **Configurable Customer Verification Switch**:
   - Per-outlet settings: `require_customer_name`, `require_customer_phone`, and `customer_auth_mode` (`DIRECT_GUEST` vs. `OTP_VERIFIED`), with `localStorage` session persistence.
6. **Pluggable Payment Engine (Demo UPI Pilot → Production PG)**:
   - See [04_DEMO_UPI_TO_PROD_PAYMENT_FLOW.md](04_DEMO_UPI_TO_PROD_PAYMENT_FLOW.md) for the full small-shop pilot (`paytm.s211ne7@pty`) + 3s return notification + seamless Razorpay/Cashfree upgrade.
7. **Real-Time WebSockets KDS (Zero Polling)**:
   - Pure Socket.io rooms (`outlet_{outletId}`, `order_{orderId}`, `admin:all`) with instant audio chime 🔔, 4-column Kanban (*New → Preparing → Ready → Completed*), and live customer tracking.
8. **Dual-Role Operations Portal (`MD` vs. `OUTLET_STAFF`)**:
   - MD has cross-branch control, outlet/staff creation, QR Master, payment toggles, and Menu Sync.
   - Outlet Staff login automatically scopes via `user.outlet_id` to their own outlet's KDS, stock switches, and QR standee.
9. **Canonical UTC ↔ IST Timezone Standard & OWASP Security**:
   - DB stores strict UTC (`TIMESTAMPTZ`); API returns ISO 8601 UTC; Frontend converts dynamically to `Asia/Kolkata` (IST) + live elapsed seconds.
   - Public vs. Private API split, parameterized SQL, Zod schemas, IDOR guards, Helmet CSP, and rate limiting.

### B. Out-of-Scope (Preventing Scope Creep)
- Modifying or sharing the main marketing website database (`www.sharonteastall.com`).
- Third-party delivery rider dispatch / fleet tracking.
- Raw material kitchen inventory / GST accounting ERP.
- Native iOS / Android App Store binaries (delivered as responsive PWA).

---

## 4. Phased Execution Roadmap & Exit Criteria

| Phase | Scope | Key Output | Exit / Verification Criteria |
| :--- | :--- | :--- | :--- |
| **Phase 1: Workspace & Shared Core** | Monorepo init, `packages/shared` types, Zod schemas, UTC↔IST date utilities | Shared package builds cleanly | `toUTCISOString`, `formatISTDateTime`, `getElapsedSeconds`, Zod schemas compile with 0 TS errors |
| **Phase 2: Contactless DB & Seed** | Dedicated dual-copy PostgreSQL schema (`schema.production.sql` & `schema.development.sql`), UTC pool, split seeds | Live isolated DB | Both SQL files 100% column-synced; `TIMESTAMPTZ` UTC; 3 branches, modifiers, and MD account seeded idempotently |
| **Phase 3: Backend REST & Menu Sync** | Express app, Public APIs, Private JWT/RBAC APIs, Website Menu Sync, QR Master, Payment Adapter | Working API on port `5001` | Menu sync pulls 55 items from `api.sharonteastall.com`; public DTOs verified free of confidential fields |
| **Phase 4: Socket.io Real-Time Engine** | Room isolation (`outlet_{id}`, `order_{id}`, `admin:all`), event broadcasters | Zero-polling push layer | Order creation & stock toggle push sub-second updates without polling |
| **Phase 5: Customer PWA (`apps/order`)** | Stitch UI → React + Tailwind + TanStack Query + Zustand, Modifier Modal, Upsells, Demo UPI & Live Tracker | `order.sharonteastall.com` bundle | End-to-end scan → customize → upsell → UPI intent/QR → 3s notification → live tracking works on mobile |
| **Phase 6: Operations Portal (`apps/dashboard`)** | Ant Design + React, Role scoping, Live KDS Kanban + Audio Chime 🔔, Stock Switches, QR Standee, Sync UI | `dashboard.sharonteastall.com` bundle | Staff login auto-scopes to branch; new order chimes immediately; counter payment verify & brew transitions live |
| **Phase 7: Security Hardening** | OWASP review: IDOR tests, Rate limits, Helmet CSP, CORS strict list, `npm audit` | Hardened production build | Staff from Branch A gets `403` attempting to modify Branch B; tampered client prices rejected server-side |
| **Phase 8: Infrastructure & Pilot Launch** | Dedicated EC2 (PM2 + Nginx WS upgrade), S3 + CloudFront subdomains, Small Shop QR Pilot | Live Demo & Production ready | Live mobile QR scan test passes end-to-end with `paytm.s211ne7@pty`; PG switch ready for Razorpay/Cashfree |
