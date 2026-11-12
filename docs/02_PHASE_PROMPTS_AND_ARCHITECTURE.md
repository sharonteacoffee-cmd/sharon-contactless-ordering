# 02 — System Architecture, Database Schema & Phase Build Prompts

---

## 1. System Topology & Decoupled API Communication

```mermaid
flowchart TD
    subgraph ClientLayer["Subdomains & Client Applications"]
        OrderApp["https://order.sharonteastall.com\n(Customer Contactless PWA\nTanStack Query + Zustand)"]
        DashboardApp["https://dashboard.sharonteastall.com\n(MD & Staff Portal\nAnt Design + TanStack Query)"]
    end

    subgraph DedicatedBackend["Dedicated Contactless Backend (Separate EC2)"]
        Nginx["Nginx Reverse Proxy\n(Port 80/443 + WS Upgrade)"]
        NodeServer["Node.js 20 + Express API\n(PM2 Service: contactless-api)"]
        SocketServer["Socket.io Engine\n(Rooms: outlet_{id}, order_{id}, admin:all)"]
        ContactlessDB[(Dedicated PostgreSQL DB\nsharon_contactless_db\nStrict UTC Timestamps)]
    end

    subgraph ExistingPlatform["Existing Main Sharon Platform"]
        MainAPI["https://api.sharonteastall.com\n(55 Official Beverage Items & S3 Imagery)"]
    end

    OrderApp -->|Public REST + WebSocket| Nginx
    DashboardApp -->|Private Bearer JWT + WebSocket| Nginx
    Nginx --> NodeServer
    Nginx --> SocketServer
    NodeServer <--> ContactlessDB
    SocketServer <--> ContactlessDB

    NodeServer -.->|MD Clicks 'Sync Menus' (REST GET)| MainAPI
    MainAPI -->>|55 Official Items Payload| NodeServer
    NodeServer -->|Upsert Catalog & S3 URLs| ContactlessDB
```

---

## 2. Database Schema — Single-Page Dual-Copy Standard

> [!IMPORTANT]
> **NO `001`, `002`, `003` Migration Files — Maintain Two Single-Page Copies in Sync:**
> 1. **`services/contactless-api/src/database/schema.production.sql`**: Clean single-page DDL (`CREATE TABLE IF NOT EXISTS` with every latest column baked in, zero `ALTER TABLE` clutter).
> 2. **`services/contactless-api/src/database/schema.development.sql`**: Complete schema + idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements for iterative dev changes.
> 3. **Mandatory Sync Rule**: Whenever ANY UI form field, API field, or SQL query adds/alters a column in `schema.development.sql`, you **MUST ALSO** add that column cleanly into `schema.production.sql` in the exact same task so fresh production builds never break due to missing columns.

### 2.1 Production Master Schema (`schema.production.sql`)

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Business ID Sequences (Concurrency-Safe per TECH_STACK_MASTER.md Section 26)
CREATE SEQUENCE IF NOT EXISTS seq_outlet_business_id START 1;
CREATE SEQUENCE IF NOT EXISTS seq_user_business_id START 1;
CREATE SEQUENCE IF NOT EXISTS seq_order_business_id START 1;
CREATE SEQUENCE IF NOT EXISTS seq_payment_txn_business_id START 1;
CREATE SEQUENCE IF NOT EXISTS seq_qr_business_id START 1;
CREATE SEQUENCE IF NOT EXISTS seq_menu_sync_business_id START 1;

-- 1. Outlets
CREATE TABLE IF NOT EXISTS outlets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id VARCHAR(50) UNIQUE NOT NULL, -- e.g. "OUT2611120001"
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50) NOT NULL,
    operating_hours VARCHAR(255) DEFAULT '6:00 AM - 11:00 PM',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_ordering_enabled BOOLEAN NOT NULL DEFAULT true,
    customer_auth_mode VARCHAR(50) NOT NULL DEFAULT 'DIRECT_GUEST', -- 'DIRECT_GUEST' | 'OTP_VERIFIED'
    require_customer_phone BOOLEAN NOT NULL DEFAULT true,
    require_customer_name BOOLEAN NOT NULL DEFAULT true,
    payment_provider VARCHAR(50) NOT NULL DEFAULT 'DEMO_UPI_INTENT', -- 'DEMO_UPI_INTENT' | 'RAZORPAY' | 'CASHFREE'
    demo_auto_verify_payment BOOLEAN NOT NULL DEFAULT false,
    upi_vpa VARCHAR(255) DEFAULT 'paytm.s211ne7@pty',
    upi_payee_name VARCHAR(255) DEFAULT 'MUNISWAMY JOSHVA',
    estimated_prep_time_minutes INT DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Staff Users & Roles (MD vs Branch Staff)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id VARCHAR(50) UNIQUE NOT NULL, -- e.g. "USR2611120001"
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('MD', 'OUTLET_STAFF')),
    outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Master Categories & Menu Items (Synced via REST from main website)
CREATE TABLE IF NOT EXISTS menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_main_id VARCHAR(255),
    category_slug VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    is_vegetarian BOOLEAN DEFAULT true,
    is_bestseller BOOLEAN DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Outlet-Level Stock & Price Overrides
CREATE TABLE IF NOT EXISTS outlet_menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    is_available BOOLEAN NOT NULL DEFAULT true,
    custom_price DECIMAL(10, 2),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_outlet_menu_item UNIQUE (outlet_id, menu_item_id)
);

CREATE INDEX IF NOT EXISTS idx_outlet_menu_items ON outlet_menu_items(outlet_id, is_available);

-- 5. Beverage Modifiers (Sugar, Strength, Add-ons)
CREATE TABLE IF NOT EXISTS modifier_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    display_type VARCHAR(50) NOT NULL DEFAULT 'RADIO', -- 'RADIO' | 'CHECKBOX'
    is_required BOOLEAN NOT NULL DEFAULT false,
    min_selection INT DEFAULT 0,
    max_selection INT DEFAULT 1,
    sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS modifier_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price_extra DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    is_default BOOLEAN NOT NULL DEFAULT false,
    sort_order INT DEFAULT 0
);

-- 6. Customer Orders (Canonical UTC Timestamps)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id VARCHAR(50) UNIQUE NOT NULL, -- e.g. "ORD2611120001"
    payment_transaction_id VARCHAR(50) UNIQUE, -- e.g. "TXN2611120001"
    order_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. "#SH-IND-101"
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    table_or_token VARCHAR(50),
    items JSONB NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_provider VARCHAR(50) NOT NULL DEFAULT 'DEMO_UPI_INTENT',
    payment_method VARCHAR(50) NOT NULL DEFAULT 'UPI', -- 'UPI' | 'CASH' | 'ONLINE'
    payment_status VARCHAR(50) NOT NULL DEFAULT 'PAYMENT_PENDING', -- 'PAYMENT_PENDING' | 'UPI_CLAIMED_DEMO' | 'PAID_VERIFIED' | 'REFUNDED'
    payment_reference VARCHAR(255),
    order_status VARCHAR(50) NOT NULL DEFAULT 'RECEIVED', -- 'RECEIVED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_outlet_status ON orders(outlet_id, order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- 7. QR Master (Token Management & Standees)
CREATE TABLE IF NOT EXISTS outlet_qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id VARCHAR(50) UNIQUE NOT NULL, -- e.g. "QR2611120001"
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    qr_token VARCHAR(255) UNIQUE NOT NULL,
    label VARCHAR(255) NOT NULL DEFAULT 'Counter Standee',
    is_active BOOLEAN NOT NULL DEFAULT true,
    scans_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Menu Sync Audit Log
CREATE TABLE IF NOT EXISTS menu_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id VARCHAR(50) UNIQUE NOT NULL, -- e.g. "SYNC2611120001"
    synced_by UUID REFERENCES users(id),
    items_synced INT NOT NULL,
    source_url TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 Development Sync Schema (`schema.development.sql` Pattern)
Keep the same base `CREATE` statements above PLUS an explicit bottom section for safe, idempotent `ALTER TABLE` additions while building UI/API changes in dev — **and mirror every added column back into `schema.production.sql` immediately**:
```sql
-- ============================================================================
-- DEVELOPMENT INCREMENTAL ALTERS (MUST BE MIRRORED INTO schema.production.sql)
-- ============================================================================
-- Example pattern whenever UI/API adds a new column during development:
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_transaction_id VARCHAR(50) UNIQUE;
-- ALTER TABLE outlets ADD COLUMN IF NOT EXISTS demo_auto_verify_payment BOOLEAN NOT NULL DEFAULT false;
```

---

## 3. Public vs. Private API Separation (Sharon PascalCase Standard)

> Full endpoint contracts, DTO allowlists, controller/service function names (`camelCase`), and error envelopes are defined in **[06_API_NAMING_AND_DEVELOPER_SPEC.md](06_API_NAMING_AND_DEVELOPER_SPEC.md)**.

| Dimension | Public APIs (`/api/v1/Public/*`) | Private APIs (`/api/v1/Private/*`) |
| :--- | :--- | :--- |
| **Consumer** | `order.sharonteastall.com` | `dashboard.sharonteastall.com` |
| **Auth** | Public / Optional Customer OTP Session | Bearer JWT (`MD` or `OUTLET_STAFF`) |
| **Field Policy** | Sanitized DTOs only (menu, stock status, modifiers, tracking, UPI payload) | Full staff/MD data, cost/revenue totals, QR management, sync history |
| **Endpoints** | `GET /Public/Outlet/GetPublicOutlets`<br>`GET /Public/Outlet/GetPublicOutletBySlug/:outletSlug`<br>`GET /Public/Menu/GetPublicMenu/:outletSlug`<br>`POST /Public/Order/CreatePublicOrder`<br>`POST /Public/Order/SubmitDemoPayment/:orderBusinessId`<br>`GET /Public/Order/GetPublicOrderById/:orderBusinessId`<br>`POST /Public/Auth/SendCustomerOtp`<br>`POST /Public/Auth/VerifyCustomerOtp`<br>`POST /Public/Webhook/PaymentCallback/:provider` | `POST /Private/Auth/Login`<br>`GET /Private/Auth/GetCurrentProfile`<br>`POST /Private/MenuSync/SyncFromWebsite`<br>`GET /Private/MenuSync/GetSyncLogs`<br>`GET /Private/OutletStock/GetOutletStock/:outletBusinessId`<br>`PATCH /Private/OutletStock/ToggleItemAvailability/:outletBusinessId/:menuItemId`<br>`GET /Private/Order/GetLiveOrders`<br>`GET /Private/Order/GetOrderHistory`<br>`PATCH /Private/Order/UpdateOrderStatus/:orderBusinessId`<br>`PATCH /Private/Order/VerifyOrderPayment/:orderBusinessId`<br>`POST /Private/QrMaster/GenerateQrCode`<br>`PATCH /Private/QrMaster/UpdateQrStatus/:qrBusinessId` |

---

## 4. Turnkey Phase-by-Phase Build Prompts

### Phase 1: Shared Contracts & UTC↔IST Date Engine (`packages/shared`)
```text
Task: Implement Phase 1 in `packages/shared`.
1. In `src/utils/date.ts`, implement canonical UTC <-> dynamic IST helpers:
   - `toUTCISOString(date: Date | string | number): string`
   - `formatISTTime(utcString: string): string` using Intl.DateTimeFormat with timeZone: 'Asia/Kolkata'
   - `formatISTDateTime(utcString: string): string` (with ' IST' suffix)
   - `getElapsedSeconds(utcString: string): number`
2. In `src/types/contactless.ts`, define `ContactlessOrder`, `OrderItemPayload`, `SelectedModifier`, `OutletPublicInfo`, `OrderStatus`, `PaymentStatus`, `PaymentProvider`, `CustomerAuthMode`.
3. In `src/schemas/contactless.ts`, implement Zod schemas (`createPublicOrderSchema`, `toggleStockSchema`, `submitDemoPaymentSchema`).
4. Verify with `pnpm --filter @sharon/shared build`.
```

### Phase 2: Database Layer, Dual-Copy Schema & Business IDs (`services/contactless-api`)
```text
Task: Implement Phase 2 Database Layer in `services/contactless-api` per `docs/06_API_NAMING_AND_DEVELOPER_SPEC.md`.
1. Create TWO single-page SQL files (NO `001`, `002`, `003` numbered files):
   - `src/database/schema.production.sql`: clean complete `CREATE SEQUENCE/TABLE/INDEX IF NOT EXISTS` with strict TIMESTAMPTZ UTC columns.
   - `src/database/schema.development.sql`: complete dev DDL + idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` upgrade section (both files kept 100% column-identical).
2. In `src/database/connection.ts`, configure `pg.Pool` executing `SET TIME ZONE 'UTC'` on every connection; implement `generateNextBusinessId()` in `src/database/businessIdGenerator.ts`.
3. Separate seeds cleanly into `src/seed/reference.seed.ts` (required Sugar/Strength modifiers & MD bootstrap from env) and `src/seed/dev.seed.ts` (Indiranagar/New Thippasandra/Kaggadasapura outlets + `paytm.s211ne7@pty` pilot config — guarded by `NODE_ENV === 'development'`).
```

### Phase 3: Backend REST APIs, Menu Sync & Payment Adapter
```text
Task: Implement Phase 3 REST APIs in `services/contactless-api` following `Routes -> Validator -> Controller -> Service -> Repository` and Sharon's PascalCase endpoint standard.
1. Public modules (`/api/v1/Public/*`):
   - `publicOutlet.{routes,controller,service,repository,dto}.ts` (`handleGetPublicOutletBySlug`, `getPublicOutletBySlug()`).
   - `publicMenu.{routes,controller,service,repository,dto}.ts` (`handleGetPublicMenu`, `getPublicMenuByOutletSlug()`).
   - `publicOrder.{routes,validator,controller,service,repository,dto}.ts`: `createPublicOrder()` computes prices strictly from DB, generates `ORD...` + `TXN...` + `#SH-<CODE>-<SEQ>` token, builds `upi://pay` link via PaymentStrategy adapter; `submitDemoPayment()` transitions `PAYMENT_PENDING` -> `UPI_CLAIMED_DEMO` (only when `payment_provider === 'DEMO_UPI_INTENT'`).
2. Private modules (`/api/v1/Private/*`):
   - `auth.*`: `handleStaffLogin` / `loginStaffUser()` issuing JWT (`userId`, `businessId`, `role`, `outletId`).
   - `menuSync.*`: MD-only `handleSyncFromWebsite` / `syncMenuFromWebsite()` fetching `https://api.sharonteastall.com/api/v1/Product/GetPublicProducts` -> UPSERT `menu_items` + `outlet_menu_items` + log `SYNC...` in `menu_sync_logs`.
   - `outletStock.*`, `orderManagement.*`, `qrMaster.*` with IDOR checks and sanitized error envelopes.
3. Validate env vars at boot via `src/config/*.config.ts`, enforce Helmet, strict CORS whitelist, parameterized SQL, and IP rate limiters.
```

### Phase 4: Real-Time Socket.io Engine
```text
Task: Implement Phase 4 WebSocket Engine in `services/contactless-api/src/socket/index.ts`.
1. Attach Socket.io server to HTTP server (zero polling).
2. Implement authenticated room joins:
   - `join:outlet` (verify JWT & `outletId` ownership -> join `outlet_${outletId}`)
   - `join:admin` (verify `role === 'MD'` -> join `admin:all`)
   - `join:order` (public customer tracking -> join `order_${orderId}`)
3. Export broadcasters: `order:new`, `order:status_updated`, `order:payment_verified`, `outlet:stock_changed`.
```

### Phase 5: Customer PWA (`apps/order` → `order.sharonteastall.com`)
```text
Task: Implement Phase 5 Customer Ordering PWA in `apps/order` using the Stitch AI Glassmorphism UI spec.
1. Setup Vite + React 18 + TypeScript + Tailwind + TanStack Query + Zustand + Socket.io-client.
2. Client-only Zustand cart store (`useCartStore`) + `localStorage` customer profile persistence.
3. Build `/order/:outletSlug`: Outlet header, category pills, beverage grid with Sold Out state, `ItemModifierModal`, `UpsellTray` (Osmania Biscuit / Bun Maska / Samosa), Customer Verification drawer (`DIRECT_GUEST` vs `OTP_VERIFIED`), and UPI Intent + Dynamic QR Pay step with 3-second `visibilitychange` return confirmation.
4. Build `/order/status/:orderId`: Socket.io live stepper, Token card, IST time + live elapsed seconds counter, and Counter Verification Pass badge.
```

### Phase 6: Operations Portal (`apps/dashboard` → `dashboard.sharonteastall.com`)
```text
Task: Implement Phase 6 Operations Dashboard in `apps/dashboard`.
1. Setup Vite + React 18 + Ant Design + Tailwind + TanStack Query + Zustand + Socket.io-client.
2. Role-scoped `DashboardLayout`: MD sees outlet switcher, analytics, QR Master, and Menu Sync; Outlet Staff auto-locks to `user.outletId`.
3. `LiveOrdersKdsPage`: 4-column Kanban (New 🔔 | Preparing | Ready | Completed), instant audio chime on `order:new`, 1-tap **"Verify Payment & Brew"** for `UPI_CLAIMED_DEMO` orders, and live elapsed seconds timer in IST.
4. `StockControlPage`, `MenuSyncPage` ("Sync Menus from Website"), and `QrMasterPage` (generate, disable, export standee).
```

### Phase 7: OWASP Security Hardening
```text
Task: Perform Phase 7 Security Audit & Hardening across all workspaces per `D:\LOTUS\Project Stack\Advanced\security.txt` and `docs/06_API_NAMING_AND_DEVELOPER_SPEC.md`.
1. Verify IDOR isolation on every `/api/v1/Private/*` route (Staff A cannot view/mutate Outlet B).
2. Verify server-side price recalculation, sequence-based Business ID generation (`ORD`, `TXN`, `USR`, `OUT`, `QR`, `SYNC`), and strict rejection of client-supplied payment verification flags.
3. Configure Helmet CSP, CORS strict domain list, rate limiting on `Login`, `SendCustomerOtp`, and `CreatePublicOrder`, and run `pnpm audit`.
```

### Phase 8: Infrastructure, Nginx WebSocket Proxy & Pilot Verification
```text
Task: Implement Phase 8 Deployment on separate EC2 + S3/CloudFront.
1. Configure Nginx with WebSocket Upgrade headers for `/socket.io/` and proxy to PM2 `contactless-api`.
2. Deploy `apps/order` -> `order.sharonteastall.com` and `apps/dashboard` -> `dashboard.sharonteastall.com` via S3 + CloudFront.
3. Run live small-shop pilot verification with Paytm QR (`paytm.s211ne7@pty`) -> confirm 3s notification, KDS bell chime, IST timestamps, and stock isolation.
```
