# 06 — Complete Developer Specification, Naming Standards & API Contracts

> **Authoritative Engineering Reference**  
> Aligned with **`D:\LOTUS\Project Stack\Advanced\TECH_STACK_MASTER.md`**, **`security.txt`**, and Sharon Tea & Coffee's production backend convention (**`api.sharonteastall.com`**).  
> **Database Engine Note**: This workspace intentionally uses **PostgreSQL (`pg`)** and **Argon2 (`argon2`)** (upgraded over the generic MySQL/`bcrypt` baseline in `TECH_STACK_MASTER.md`) with strict UTC `TIMESTAMPTZ` enforcement.

---

## 1. Coding, Naming & File Architecture Standards

### 1.1 Naming Conventions Matrix

| Artifact Type | Convention | Exact Project Examples |
| :--- | :--- | :--- |
| **API Module Mounts** | **`PascalCase`** | `/api/v1/Public/Outlet`, `/api/v1/Public/Menu`, `/api/v1/Public/Order`, `/api/v1/Public/Auth`, `/api/v1/Public/Webhook`, `/api/v1/Private/Auth`, `/api/v1/Private/MenuSync`, `/api/v1/Private/OutletStock`, `/api/v1/Private/Order`, `/api/v1/Private/QrMaster` |
| **API Action Paths** | **`PascalCase`** | `/GetPublicOutletBySlug/:slug`, `/GetPublicMenu/:outletSlug`, `/CreatePublicOrder`, `/SubmitDemoPayment/:orderBusinessId`, `/GetLiveOrders`, `/UpdateOrderStatus/:orderBusinessId`, `/SyncFromWebsite` |
| **Controller Handlers** | `camelCase` (`handle<Verb><Resource>`) | `handleGetPublicOutletBySlug`, `handleCreatePublicOrder`, `handleSubmitDemoPayment`, `handleToggleOutletStock`, `handleUpdateOrderStatus`, `handleVerifyOrderPayment`, `handleSyncFromWebsite` |
| **Service Functions** | `camelCase` (`<verb><Resource>`) | `getPublicOutletBySlug`, `getPublicMenuByOutletSlug`, `createPublicOrder`, `submitDemoPayment`, `getPublicOrderById`, `loginStaffUser`, `syncMenuFromWebsite`, `toggleOutletStock`, `getLiveOrders`, `updateOrderStatus`, `verifyOrderPayment`, `generateQrCode`, `disableQrCode` |
| **Repository Functions** | `camelCase` (`find*`, `insert*`, `update*`, `upsert*`, `nextBusinessId`) | `findOutletBySlug`, `findAvailableMenuByOutlet`, `insertOrderWithTransaction`, `updateOrderDemoClaim`, `findLiveOrdersByOutlet`, `upsertMasterMenuItems`, `generateNextBusinessId` |
| **Frontend API Clients** | `camelCase` (`<verb><Resource>`) | `getPublicOutletBySlug()`, `getPublicMenu()`, `createPublicOrder()`, `submitDemoPayment()`, `getOrderStatus()`, `loginStaff()`, `getLiveOrders()`, `updateOrderStatus()`, `verifyOrderPayment()`, `toggleOutletStock()`, `syncMenuFromWebsite()`, `generateQrStandee()` |
| **TanStack Query Hooks** | `camelCase` (`use<Resource><Action>`) | `usePublicOutletQuery`, `usePublicMenuQuery`, `useCreateOrderMutation`, `useSubmitDemoPaymentMutation`, `useLiveOrdersQuery`, `useUpdateOrderStatusMutation`, `useVerifyPaymentMutation`, `useToggleStockMutation` |
| **Zustand Stores** | `camelCase` (`use<Name>Store`) | `useCartStore`, `useCustomerUiStore`, `useDashboardUiStore` |
| **React Components** | **`PascalCase`** | `MenuCard.tsx`, `ItemModifierModal.tsx`, `UpsellTray.tsx`, `CustomerVerificationDrawer.tsx`, `UpiIntentPaySheet.tsx`, `LiveStatusStepper.tsx`, `KdsOrderBoard.tsx`, `StockSwitchTable.tsx`, `QrStandeeModal.tsx` |
| **Zod Schemas & Validators** | `camelCase` (`<name>Schema`) | `createPublicOrderSchema`, `submitDemoPaymentSchema`, `staffLoginSchema`, `toggleStockSchema`, `updateOrderStatusSchema`, `verifyPaymentSchema`, `generateQrSchema` |
| **DB Tables & Columns** | `snake_case` | `menu_items`, `outlet_menu_items`, `order_business_id`, `payment_status`, `created_at` |

---

### 1.2 Backend Domain File Structure (`services/contactless-api/src/`)

Follow strict separation of concerns (`Routes -> Validator -> Controller -> Service -> Repository -> DB`):

```text
services/contactless-api/src/
├── config/
│   ├── app.config.ts              # Validates PORT, NODE_ENV, CORS origins (fail-fast at boot)
│   ├── database.config.ts         # Validates DATABASE_URL & pool sizing
│   ├── auth.config.ts             # Validates JWT_SECRET & expiry rules
│   └── integration.config.ts      # Validates MAIN_WEBSITE_API_URL & PG secrets
├── database/
│   ├── connection.ts              # pg.Pool forcing SET TIME ZONE 'UTC' on every connection
│   ├── businessIdGenerator.ts     # Safe PostgreSQL sequence-based ID generator (Section 2)
│   ├── schema.production.sql      # SINGLE-PAGE clean production DDL (CREATE TABLE only, all latest columns)
│   └── schema.development.sql     # SINGLE-PAGE dev DDL + idempotent ALTER TABLE sync statements
├── seed/
│   ├── index.ts                   # Idempotent seed runner (safe to execute repeatedly)
│   ├── reference.seed.ts          # Required master modifiers & production-safe defaults
│   └── dev.seed.ts                # Test outlets & demo accounts (NEVER auto-run in production)
├── middleware/
│   ├── authenticate.middleware.ts # Verifies JWT Bearer token & active user status
│   ├── authorize.middleware.ts    # RBAC ('MD' | 'OUTLET_STAFF') + outlet scope IDOR check
│   ├── validate.middleware.ts     # Generic Zod request validator (body, params, query)
│   ├── rateLimiter.middleware.ts  # IP limits on CreatePublicOrder, SendOtp, Login
│   └── errorHandler.middleware.ts # Sanitizes 4xx/5xx responses (no SQL/stack trace leaks)
├── strategies/payment/
│   ├── paymentStrategy.interface.ts
│   ├── demoUpiPayment.strategy.ts
│   ├── razorpayPayment.strategy.ts
│   └── cashfreePayment.strategy.ts
├── socket/
│   ├── socketServer.ts            # Room auth & Socket.io instance
│   └── socketBroadcaster.ts       # emitNewOrder, emitOrderStatusUpdated, emitStockChanged
├── modules/
│   ├── publicOutlet/
│   │   ├── publicOutlet.routes.ts
│   │   ├── publicOutlet.controller.ts
│   │   ├── publicOutlet.service.ts
│   │   ├── publicOutlet.repository.ts
│   │   ├── publicOutlet.dto.ts        # Public allowlisted field mapper
│   │   └── publicOutlet.types.ts
│   ├── publicMenu/
│   │   ├── publicMenu.routes.ts
│   │   ├── publicMenu.controller.ts
│   │   ├── publicMenu.service.ts
│   │   ├── publicMenu.repository.ts
│   │   └── publicMenu.dto.ts
│   ├── publicOrder/
│   │   ├── publicOrder.routes.ts
│   │   ├── publicOrder.validator.ts
│   │   ├── publicOrder.controller.ts
│   │   ├── publicOrder.service.ts
│   │   ├── publicOrder.repository.ts
│   │   └── publicOrder.dto.ts
│   ├── publicAuth/                    # Customer OTP flow (used only when outlet = OTP_VERIFIED)
│   │   ├── publicAuth.routes.ts
│   │   ├── publicAuth.validator.ts
│   │   ├── publicAuth.controller.ts
│   │   └── publicAuth.service.ts
│   ├── webhook/
│   │   ├── webhook.routes.ts
│   │   ├── webhook.controller.ts
│   │   └── webhook.service.ts
│   ├── auth/                          # Staff & MD authentication
│   │   ├── auth.routes.ts
│   │   ├── auth.validator.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.repository.ts
│   ├── menuSync/                      # MD-only REST sync from api.sharonteastall.com
│   │   ├── menuSync.routes.ts
│   │   ├── menuSync.controller.ts
│   │   ├── menuSync.service.ts
│   │   └── menuSync.repository.ts
│   ├── outletStock/
│   │   ├── outletStock.routes.ts
│   │   ├── outletStock.validator.ts
│   │   ├── outletStock.controller.ts
│   │   ├── outletStock.service.ts
│   │   └── outletStock.repository.ts
│   ├── orderManagement/
│   │   ├── orderManagement.routes.ts
│   │   ├── orderManagement.validator.ts
│   │   ├── orderManagement.controller.ts
│   │   ├── orderManagement.service.ts
│   │   └── orderManagement.repository.ts
│   └── qrMaster/
│       ├── qrMaster.routes.ts
│       ├── qrMaster.validator.ts
│       ├── qrMaster.controller.ts
│       ├── qrMaster.service.ts
│       └── qrMaster.repository.ts
├── app.ts
└── server.ts
```

### 1.3 Frontend Structure (`apps/order/src/` & `apps/dashboard/src/`)

```text
src/
├── api/
│   ├── axiosClient.ts             # Base URL + token interceptor + 401 handler (dashboard)
│   ├── queryKeys.ts               # Centralized TanStack Query key factory
│   └── endpoints.ts               # Typed PascalCase API route constants
├── services/                      # Pure async API calls returning typed DTOs
├── hooks/                         # TanStack Query useQuery / useMutation + Socket.io hooks
├── stores/                        # Zustand stores (UI/cart/preferences ONLY — NO API mirrors)
├── components/
│   ├── common/                    # ErrorBoundary, EmptyState, SystemErrorView, IstClockBadge
│   └── domain/                    # MenuCard, ItemModifierModal, KdsOrderColumn, etc.
├── layouts/                       # CustomerLayout, DashboardLayout
├── pages/                         # Route pages + System error pages (401, 403, 404, 500, 503)
├── routes/                        # Route definitions & ProtectedRoute / RoleRoute guards
├── types/
└── utils/
```

**Strict State & Library Boundary (`Section 6D` of `TECH_STACK_MASTER.md`)**:
- `Server State` -> **TanStack Query** (`@tanstack/react-query`) ONLY. Never copy fetched API lists into Zustand.
- `Client / Cart / UI State` -> **Zustand** (`useCartStore`, drawer toggles, audio chime mute flag).
- `UI Library` -> Custom Glassmorphism Tailwind in `apps/order`; **Ant Design (`antd`)** (`Form`, `Table`, `Modal`, `Drawer`, `Switch`, `Tag`, `Badge`, `notification`, `message`, `Skeleton`, `Empty`, `Alert`) in `apps/dashboard`.
- `Form State` -> `React Hook Form + Zod` (`apps/order`) / `Ant Design Form + Zod` (`apps/dashboard`).
- `Security Authority` -> Backend ONLY. Never trust Zustand flags or frontend form validation as authorization.

---

## 2. Authoritative Business ID Generation (`Section 26`)

Never expose raw sequential integers (`1, 2, 3`) as public identifiers, and **never** use race-prone `COUNT(*) + 1` in application memory. All business IDs are generated **server-side inside PostgreSQL transactions** using dedicated sequences (`CREATE SEQUENCE`) formatted as `<PREFIX><YYMMDD><ZERO_PADDED_SEQ>`:

| Entity | Column Name | Prefix | Format Example | Counter / PostgreSQL Sequence |
| :--- | :--- | :--- | :--- | :--- |
| **Staff User** | `business_id` | `USR` | `USR26111201` | `seq_user_business_id` |
| **Outlet** | `business_id` | `OUT` | `OUT26111201` | `seq_outlet_business_id` |
| **Order (Unique ID)** | `business_id` | `ORD` | `ORD26111201` | `seq_order_business_id` |
| **Order (Counter Token)** | `order_number` | `#SH-<CODE>-` | `#SH-IND-101` | Per-outlet sequence / atomic row upsert |
| **Payment Transaction** | `business_id` | `TXN` | `TXN26111201` | `seq_payment_txn_business_id` |
| **QR Standee** | `business_id` | `QR` | `QR26111201` | `seq_qr_business_id` |
| **Menu Sync Audit** | `business_id` | `SYNC` | `SYNC26111201` | `seq_menu_sync_business_id` |

**Implementation Function (`generateNextBusinessId`)**:
```typescript
// services/contactless-api/src/database/businessIdGenerator.ts
export async function generateNextBusinessId(
  client: PoolClient,
  prefix: 'USR' | 'OUT' | 'ORD' | 'TXN' | 'QR' | 'SYNC',
  sequenceName: string,
): Promise<string> {
  const { rows } = await client.query<{ seq: string }>(
    `SELECT nextval($1)::text AS seq`,
    [sequenceName],
  );
  const nowUtc = new Date();
  const yy = String(nowUtc.getUTCFullYear()).slice(-2);
  const mm = String(nowUtc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(nowUtc.getUTCDate()).padStart(2, '0');
  const padded = rows[0].seq.padStart(4, '0');
  return `${prefix}${yy}${mm}${dd}${padded}`;
}
```

---

## 3. Complete Route Inventory (`Sections 22, 23, 49`)

### 3.1 Customer PWA (`https://order.sharonteastall.com`)

| Route Path | Page Component | Auth / Access | Role | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `OutletSelectorLandingPage` | Public | Guest | Fallback directory if visited without scanning an outlet QR |
| `/order/:outletSlug` | `OutletMenuPage` | Public | Guest | Resolves QR slug (`indiranagar`, etc.), shows live menu, modifiers & cart drawer |
| `/order/:outletSlug/checkout` | `CheckoutAndPayPage` | Public / Optional OTP | Guest | Collects Guest Name/Phone (or OTP verify), launches UPI Intent (`upi://pay`) / Dynamic QR |
| `/order/status/:orderBusinessId` | `OrderLiveStatusPage` | Public (scoped ID) | Guest | Real-time Socket.io brew progress, Counter Token `#SH-IND-101`, Counter Verification Pass |
| `/outlet-paused` | `OutletOrderingPausedPage` | Public (System) | Guest | Shown when outlet `is_ordering_enabled === false` |
| `/maintenance` | `MaintenancePage` | Public (System) | Guest | Shown during planned downtime (`503`) |
| `/404` / `*` | `NotFoundPage` | Public (Error) | Guest | Invalid outlet slug or broken QR link |
| `/500` | `ServerErrorPage` | Public (Error) | Guest | Unexpected backend error fallback + React ErrorBoundary reset |

### 3.2 Operations Dashboard (`https://dashboard.sharonteastall.com`)

| Route Path | Page Component | Auth / Access | Role | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `/login` | `StaffLoginPage` | Public (Guest-only) | Any | Staff / MD login screen; redirects authenticated users to `/kds` |
| `/kds` | `LiveOrdersKdsPage` | Private (JWT) | `MD`, `OUTLET_STAFF` | 4-column real-time Kanban KDS with audio chime & 1-tap UPI verification |
| `/stock` | `StockControlPage` | Private (JWT) | `MD`, `OUTLET_STAFF` | Outlet-scoped availability toggles & custom price overrides |
| `/orders/history` | `OrderHistoryPage` | Private (JWT) | `MD`, `OUTLET_STAFF` | Server-paginated order history (Ant Design Table + IST formatted timestamps) |
| `/md/overview` | `MdAnalyticsOverviewPage` | Private (JWT) | `MD` only | Cross-outlet revenue, order velocity, and branch comparison |
| `/md/menu-sync` | `MenuSyncPage` | Private (JWT) | `MD` only | One-click `"Sync Menus from Website"` + sync log table (`SYNC...`) |
| `/md/qr-master` | `QrMasterPage` | Private (JWT) | `MD` only | Generate, disable, download print-ready standee PNG/PDF per outlet |
| `/md/outlets` | `OutletConfigPage` | Private (JWT) | `MD` only | Configure `customer_auth_mode`, `payment_provider`, `upi_vpa`, pause flags |
| `/401` | `UnauthorizedPage` | System Error | Any | Expired/missing session prompt back to `/login` |
| `/403` | `ForbiddenPage` | System Error | Authenticated | Shown if `OUTLET_STAFF` accesses MD routes or mismatched outlet ID |
| `/404` / `*` | `DashboardNotFoundPage` | System Error | Any | Unknown dashboard route |
| `/500` | `DashboardErrorPage` | System Error | Any | React ErrorBoundary & 500 fallback |
| `/503` | `ServiceUnavailablePage` | System Error | Any | Maintenance / backend unreachable fallback |

---

## 4. Complete API Inventory (`Sections 13–19, 50`)

> **Convention**: Matches `api.sharonteastall.com` (`PascalCase` module + `PascalCase` action path) while strictly enforcing REST HTTP verbs (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).

### 4.1 Public APIs (`/api/v1/Public/*`)

| Endpoint | Method | Type | Auth | Role | Controller Handler | Service Function | Consumer |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/v1/Public/Outlet/GetPublicOutlets` | `GET` | Public | None | Guest | `handleGetPublicOutlets` | `getPublicOutlets()` | Landing selector |
| `/api/v1/Public/Outlet/GetPublicOutletBySlug/:outletSlug` | `GET` | Public | None | Guest | `handleGetPublicOutletBySlug` | `getPublicOutletBySlug()` | Customer PWA header & mode flags |
| `/api/v1/Public/Menu/GetPublicMenu/:outletSlug` | `GET` | Public | None | Guest | `handleGetPublicMenu` | `getPublicMenuByOutletSlug()` | Customer PWA menu grid |
| `/api/v1/Public/Auth/SendCustomerOtp` | `POST` | Public | None (Rate Limited) | Guest | `handleSendCustomerOtp` | `sendCustomerOtp()` | Customer checkout (`OTP_VERIFIED` outlets only) |
| `/api/v1/Public/Auth/VerifyCustomerOtp` | `POST` | Public | None (Rate Limited) | Guest | `handleVerifyCustomerOtp` | `verifyCustomerOtp()` | Customer checkout (`OTP_VERIFIED` outlets only) |
| `/api/v1/Public/Order/CreatePublicOrder` | `POST` | Public | Optional OTP Token (Rate Limited) | Guest | `handleCreatePublicOrder` | `createPublicOrder()` | Customer Checkout -> UPI payload |
| `/api/v1/Public/Order/SubmitDemoPayment/:orderBusinessId` | `POST` | Public | None (Rate Limited) | Guest | `handleSubmitDemoPayment` | `submitDemoPayment()` | Customer 3s return flow (`DEMO_UPI_INTENT` only) |
| `/api/v1/Public/Order/GetPublicOrderById/:orderBusinessId` | `GET` | Public | None | Guest | `handleGetPublicOrderById` | `getPublicOrderById()` | Customer Live Status tracker |
| `/api/v1/Public/Webhook/PaymentCallback/:provider` | `POST` | Public (Signed) | HMAC Signature | PG System | `handlePaymentWebhook` | `processPaymentWebhook()` | Razorpay / Cashfree server webhook |

**Public API Minimum-Field / DTO Sanitization Rule (`Section 16`)**:
- `GetPublicOutletBySlug` returns ONLY: `businessId`, `name`, `slug`, `address`, `operatingHours`, `isOrderingEnabled`, `customerAuthMode`, `requireCustomerPhone`, `requireCustomerName`, `paymentProvider`, `estimatedPrepTimeMinutes`.
- `GetPublicOutletBySlug` MUST NEVER expose: `upiVpa`, raw PG keys, internal margin fields, staff emails, or QR `scansCount` (note: `upiUri` is constructed server-side only at `CreatePublicOrder` time).
- `GetPublicOrderById` returns ONLY masked customer contact (`+91 •••••• 7890`), `orderBusinessId`, `orderNumber`, items summary, `totalAmount`, `orderStatus`, `paymentStatus`, `createdAt` (UTC ISO).

### 4.2 Private & Authorized APIs (`/api/v1/Private/*`)

| Endpoint | Method | Type | Auth | Role | Controller Handler | Service Function | IDOR Enforcement |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/v1/Private/Auth/Login` | `POST` | Private | None (Rate Limited) | `MD`, `OUTLET_STAFF` | `handleStaffLogin` | `loginStaffUser()` | Validates active user & Argon2 hash |
| `/api/v1/Private/Auth/GetCurrentProfile` | `GET` | Authorized | Bearer JWT | `MD`, `OUTLET_STAFF` | `handleGetCurrentProfile` | `getStaffProfileById()` | Reads `req.user.userId` only |
| `/api/v1/Private/Order/GetLiveOrders` | `GET` | Authorized | Bearer JWT | `MD`, `OUTLET_STAFF` | `handleGetLiveOrders` | `getLiveOrders()` | `OUTLET_STAFF` locked to `req.user.outletId` |
| `/api/v1/Private/Order/GetOrderHistory` | `GET` | Authorized | Bearer JWT | `MD`, `OUTLET_STAFF` | `handleGetOrderHistory` | `getOrderHistory()` | Server pagination + `outletId` scope |
| `/api/v1/Private/Order/UpdateOrderStatus/:orderBusinessId` | `PATCH` | Authorized | Bearer JWT | `MD`, `OUTLET_STAFF` | `handleUpdateOrderStatus` | `updateOrderStatus()` | Reject `403` if order belongs to other outlet |
| `/api/v1/Private/Order/VerifyOrderPayment/:orderBusinessId` | `PATCH` | Authorized | Bearer JWT | `MD`, `OUTLET_STAFF` | `handleVerifyOrderPayment` | `verifyOrderPayment()` | Transitions `UPI_CLAIMED_DEMO` -> `PAID_VERIFIED` |
| `/api/v1/Private/OutletStock/GetOutletStock/:outletBusinessId` | `GET` | Authorized | Bearer JWT | `MD`, `OUTLET_STAFF` | `handleGetOutletStock` | `getOutletStock()` | Reject `403` if `OUTLET_STAFF` accesses other outlet |
| `/api/v1/Private/OutletStock/ToggleItemAvailability/:outletBusinessId/:menuItemId` | `PATCH` | Authorized | Bearer JWT | `MD`, `OUTLET_STAFF` | `handleToggleOutletStock` | `toggleOutletStock()` | Emits `outlet:stock_changed` to Socket room |
| `/api/v1/Private/MenuSync/SyncFromWebsite` | `POST` | Authorized | Bearer JWT | **`MD` Only** | `handleSyncFromWebsite` | `syncMenuFromWebsite()` | `authorize('MD')` |
| `/api/v1/Private/MenuSync/GetSyncLogs` | `GET` | Authorized | Bearer JWT | **`MD` Only** | `handleGetSyncLogs` | `getMenuSyncLogs()` | `authorize('MD')` |
| `/api/v1/Private/QrMaster/GetQrCodes` | `GET` | Authorized | Bearer JWT | **`MD` Only** | `handleGetQrCodes` | `getAllQrCodes()` | `authorize('MD')` |
| `/api/v1/Private/QrMaster/GenerateQrCode` | `POST` | Authorized | Bearer JWT | **`MD` Only** | `handleGenerateQrCode` | `generateQrCode()` | `authorize('MD')` |
| `/api/v1/Private/QrMaster/UpdateQrStatus/:qrBusinessId` | `PATCH` | Authorized | Bearer JWT | **`MD` Only** | `handleUpdateQrStatus` | `updateQrStatus()` | `authorize('MD')` |
| `/api/v1/Private/Outlet/UpdateOutletSettings/:outletBusinessId` | `PUT` | Authorized | Bearer JWT | **`MD` Only** | `handleUpdateOutletSettings` | `updateOutletSettings()` | `authorize('MD')` |

---

## 5. Exact API Request & Response Contracts (`Sections 18, 19`)

### 5.1 Standardized Response Envelope & Error Mapping

**Success Envelope**:
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {},
  "timestampUtc": "2026-11-12T10:15:30.120Z"
}
```

**Error Envelope (No stack traces or SQL details leaked)**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please enter a valid 10-digit mobile number.",
    "details": [
      { "field": "customerPhone", "message": "Expected 10-digit Indian mobile number" }
    ]
  },
  "timestampUtc": "2026-11-12T10:15:30.120Z"
}
```

**HTTP Status Codes**:
- `200 OK` / `201 Created`: Successful read or creation.
- `400 Bad Request`: Malformed JSON or invalid parameter type.
- `401 Unauthorized`: Missing, expired, or invalid JWT token.
- `403 Forbidden`: Valid JWT, wrong Role (`OUTLET_STAFF` calling MD route) or cross-outlet IDOR attempt.
- `404 Not Found`: Unknown outlet slug, order ID, or QR token.
- `409 Conflict`: Item out of stock during checkout or invalid state transition (`CANCELLED` -> `PREPARING`).
- `422 Unprocessable Entity`: Zod schema validation error.
- `429 Too Many Requests`: Rate limit exceeded on Login, OTP, or `CreatePublicOrder`.
- `500 Internal Server Error` / `503 Service Unavailable`: Sanitized message only (`"Something went wrong. Please try again."`).

### 5.2 Key Endpoint Payloads

#### A. `POST /api/v1/Public/Order/CreatePublicOrder`
**Request**:
```json
{
  "outletSlug": "indiranagar",
  "customerName": "Rahul Sharma",
  "customerPhone": "9876543210",
  "tableOrToken": "Counter Pickup",
  "notes": "Less ice",
  "items": [
    {
      "menuItemId": "8f29e0a1-1234-4abc-9def-001122334455",
      "quantity": 2,
      "selectedModifierOptionIds": [
        "11111111-2222-3333-4444-555555555555"
      ]
    }
  ]
}
```
> Note: Client sends `menuItemId`, `quantity`, and `selectedModifierOptionIds` ONLY. **Backend computes `subtotal`, `tax`, and `totalAmount` from PostgreSQL.**

**Response (`201 Created`)**:
```json
{
  "success": true,
  "message": "Order created. Complete UPI payment to confirm.",
  "data": {
    "orderBusinessId": "ORD2611120001",
    "orderNumber": "#SH-IND-101",
    "paymentTransactionId": "TXN2611120001",
    "outletName": "Sharon Indiranagar Flagship",
    "totalAmount": 60.00,
    "paymentProvider": "DEMO_UPI_INTENT",
    "paymentStatus": "PAYMENT_PENDING",
    "orderStatus": "RECEIVED",
    "upiPayload": {
      "upiUri": "upi://pay?pa=paytm.s211ne7@pty&pn=MUNISWAMY%20JOSHVA&tr=ORD2611120001&tn=Sharon%20Order%20SH-IND-101&am=60.00&cu=INR",
      "payeeName": "MUNISWAMY JOSHVA",
      "amountFormatted": "60.00"
    },
    "createdAt": "2026-11-12T10:15:30.120Z"
  },
  "timestampUtc": "2026-11-12T10:15:30.120Z"
}
```

#### B. `POST /api/v1/Public/Order/SubmitDemoPayment/:orderBusinessId`
**Request**:
```json
{
  "upiReturnDelayMs": 3000,
  "customerConfirmedPaid": true
}
```
> Guard: Backend rejects `403` if outlet `payment_provider !== 'DEMO_UPI_INTENT'`. Transitions `PAYMENT_PENDING` -> `UPI_CLAIMED_DEMO` (NEVER directly to `PAID_VERIFIED`). Broadcasts `order:new` to `outlet_{outletId}` so counter KDS chimes 🔔.

#### C. `PATCH /api/v1/Private/Order/VerifyOrderPayment/:orderBusinessId`
**Request (`MD` or same-outlet `OUTLET_STAFF`)**:
```json
{
  "paymentReference": "GPay-4319881209",
  "startPreparingImmediately": true
}
```
> Guard: Transitions `UPI_CLAIMED_DEMO` -> `PAID_VERIFIED` and optionally sets `order_status = 'PREPARING'`. Emits `order:payment_verified` + `order:status_updated` to `order_{orderBusinessId}`.

---

## 6. Environment Configuration & Seed Separation (`Sections 28–38`)

### 6.1 Environment Variable Inventory

| Variable | App | Public / Secret | Purpose |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Backend | Configuration | `development` or `production` (controls `dev.seed.ts` block) |
| `PORT` | Backend | Configuration | Express listen port (e.g., `4100`) |
| `DATABASE_URL` | Backend | **Secret** | PostgreSQL URI pointing to `sharon_contactless_db` |
| `JWT_SECRET` | Backend | **Secret** | HS256 signing key (min 32 random chars) |
| `JWT_EXPIRES_IN` | Backend | Configuration | e.g., `12h` |
| `CORS_ALLOWED_ORIGINS` | Backend | Configuration | Comma-separated (`https://order.sharonteastall.com,https://dashboard.sharonteastall.com`) |
| `MAIN_WEBSITE_API_URL` | Backend | Configuration | `https://api.sharonteastall.com/api/v1/Product/GetPublicProducts` |
| `PAYMENT_ACTIVE_PROVIDER` | Backend | Configuration | Default strategy (`DEMO_UPI_INTENT`) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Backend | **Secret** | Phase-2 production PG keys |
| `RAZORPAY_WEBHOOK_SECRET` | Backend | **Secret** | HMAC verification secret |
| `MD_SEED_EMAIL` / `MD_SEED_PASSWORD` | Backend Seed | **Secret** | Used only by bootstrap seed, never committed to Git |
| `VITE_API_BASE_URL` | `order` & `dashboard` | Public | `https://contactless-api.sharonteastall.com/api/v1` |
| `VITE_SOCKET_URL` | `order` & `dashboard` | Public | `https://contactless-api.sharonteastall.com` |

### 6.2 `.env.example` Template (Names Only — Zero Real Values)
```env
NODE_ENV=development
PORT=4100
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=12h
CORS_ALLOWED_ORIGINS=
MAIN_WEBSITE_API_URL=https://api.sharonteastall.com/api/v1/Product/GetPublicProducts
PAYMENT_ACTIVE_PROVIDER=DEMO_UPI_INTENT
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
MD_SEED_EMAIL=
MD_SEED_PASSWORD=
VITE_API_BASE_URL=
VITE_SOCKET_URL=
```

### 6.3 Dual-Copy Single-Page Schema & Seed Separation (`Sections 28–29`)
- **Why Two Copies on One Page (No `001`, `002`, `003` Migration Chain)**:
  - Splitting changes across many numbered SQL files causes production deployment failures when a UI/API column is altered during dev testing and missed in prod.
  - **`src/database/schema.production.sql`** *(Production Clean Create)*: Single-page master DDL containing ONLY complete `CREATE EXTENSION`, `CREATE SEQUENCE IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, and `CREATE INDEX IF NOT EXISTS`. Zero `ALTER TABLE` statements — every latest column lives inside `CREATE TABLE`.
  - **`src/database/schema.development.sql`** *(Development + Alter Sync)*: Single-page script containing the complete schema PLUS idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements whenever columns/constraints are added while iterating on features.
  - **Mandatory Parity Gate**: Any time a developer or AI agent modifies a UI form, API DTO, or SQL query requiring a DB column/table change, they **MUST update BOTH `schema.development.sql` (`ALTER TABLE ... IF NOT EXISTS`) AND `schema.production.sql` (`CREATE TABLE IF NOT EXISTS` column definition) in the same edit**, and verify all queried DB columns exist in both files.
- **Reference Seed (`seed/reference.seed.ts`)**: Required static master data (Sugar Level & Tea Strength modifiers, base initial MD account via `ON CONFLICT DO NOTHING` using env password). Safe for production.
- **Development Seed (`seed/dev.seed.ts`)**: Sample outlets, test staff accounts, and dummy orders. **Strictly blocked unless `NODE_ENV === 'development'`.**

---

## 7. Security, Schema Parity & Canonical Time Verification Checklist (`Sections 51, 55, 59`)

- [ ] **Dev↔Prod Schema Parity**: Every table, column, constraint, and sequence added via `ALTER TABLE` in `schema.development.sql` (or used by any API/UI) is ALSO present cleanly inside `schema.production.sql`. Zero numbered `001`/`002`/`003` drift files exist.
- [ ] **UTC Database**: `pg.Pool` executes `SET TIME ZONE 'UTC'`; no `TIMESTAMP` without time zone exists.
- [ ] **IST Presentation**: Frontends dynamically format UTC strings into `Asia/Kolkata` and append `' IST'`.
- [ ] **API Naming Consistency**: All endpoints follow `/api/v1/Public|Private/<PascalCaseModule>/<PascalCaseAction>`; all JS/TS functions use `camelCase`.
- [ ] **Business ID Concurrency Safety**: All Business IDs (`USR`, `OUT`, `ORD`, `TXN`, `QR`, `SYNC`) generated via PostgreSQL sequences (`nextval`), never `count + 1`.
- [ ] **IDOR Isolation**: Every `/Private/*` handler verifies `req.user.role === 'MD' || req.user.outletId === targetOutletId`.
- [ ] **Public DTO Allowlist**: `/Public/*` endpoints strip cost, internal flags, staff data, and raw UPI VPAs except computed order `upiUri`.
- [ ] **Zero Client Price Trust**: Backend recalculates subtotal/tax/total strictly from DB menu + modifier prices inside a serializable transaction.
- [ ] **Secrets Hygiene**: `.env*` gitignored; frontend contains only `VITE_API_BASE_URL` and `VITE_SOCKET_URL`.
