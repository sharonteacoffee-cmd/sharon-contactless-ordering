---
trigger: always_on
description: Mandatory engineering, naming, security, UTC/IST, and doc-first creation rules for Sharon Contactless Multi-Outlet QR Ordering (D:\LOTUS\contactless_order).
---

# Contactless Ordering Engineering & Security Rules

## 0. Mandatory Doc-First Gate (Always Enforce Before Creating Any File)
- **Before creating or editing any code, SQL, config, or UI file** inside `D:\LOTUS\contactless_order`, you **MUST first read**:
  1. `GEMINI.md` and `docs/06_API_NAMING_AND_DEVELOPER_SPEC.md` (naming, folder/file structure, Business IDs, route/API inventory, request/response DTOs, `.env.example`, seed separation)
  2. `docs/02_PHASE_PROMPTS_AND_ARCHITECTURE.md` (database DDL, Socket.io events, phase prompts)
  3. The task-relevant doc (`docs/01_*.md` for monorepo layout, `docs/03_*.md` for UI/UX design tokens, `docs/04_*.md` for UPI/payment flows, `docs/05_*.md` for main-website API integration)
- Follow these specs strictly across `apps/order`, `apps/dashboard`, `services/contactless-api`, and `packages/shared`. Never invent lowercase `/api/v1/public/*` routes, `COUNT(*) + 1` IDs, or non-UTC timestamps.

## 1. Tech Stack Standards
- **Frontend Customer PWA (`apps/order`)**: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand, Zod, React Hook Form, Socket.io-client.
- **Frontend Operations Portal (`apps/dashboard`)**: React 18, TypeScript, Vite, Ant Design (`antd`), Tailwind CSS, TanStack Query, Zustand, Zod, React Hook Form, Socket.io-client.
- **Backend API (`services/contactless-api`)**: Node.js 20, Express 4, TypeScript, Socket.io, PostgreSQL (`pg`), Zod, Argon2, JWT, Helmet, `express-rate-limit`.

## 2. Database, Dual-Schema Parity & Timezone Rules
- **Single-Page Dual-Copy SQL Standard (NO `001`, `002`, `003` split)**:
  - Keep **one single-page production file** `services/contactless-api/src/database/schema.production.sql` containing ONLY complete `CREATE SEQUENCE IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, and `CREATE INDEX IF NOT EXISTS` definitions (all current columns baked cleanly inside `CREATE TABLE`, zero `ALTER TABLE` clutter).
  - Keep **one single-page development file** `services/contactless-api/src/database/schema.development.sql` containing the base schema plus idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` / upgrade statements used while developing or updating UI/APIs.
  - **MANDATORY DEV↔PROD PARITY RULE**: Whenever ANY UI form field, API request/response field, or backend SQL query adds or alters a table, column, constraint, or index, you **MUST**:
    1. Add the idempotent `ALTER TABLE` statement in `schema.development.sql`, **AND**
    2. **In the exact same change**, update the matching `CREATE TABLE IF NOT EXISTS` (or `CREATE INDEX` / `CREATE SEQUENCE`) inside `schema.production.sql` so fresh production deployments NEVER fail with missing column/table errors.
- All database connections run `SET TIME ZONE 'UTC'`.
- All timestamp columns use `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`.
- Backend responses serialize timestamps as UTC ISO 8601 (`2026-11-12T10:05:00.000Z`).
- Frontends format timestamps dynamically to `Asia/Kolkata` (IST) via `Intl.DateTimeFormat` and compute elapsed timers (`45s ago`, `2m 10s`) relative to UTC.

## 3. API Naming, Function Naming & Business ID Standards (`docs/06_API_NAMING_AND_DEVELOPER_SPEC.md`)
- **API Endpoints**: Follow Sharon's `PascalCase` module + action standard (`/api/v1/Public/<Module>/<PascalCaseAction>` and `/api/v1/Private/<Module>/<PascalCaseAction>`) paired with strict HTTP verbs (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
- **Functions & Handlers**: Use `camelCase` everywhere (`handleCreatePublicOrder`, `createPublicOrder()`, `getPublicOutletBySlug()`, `toggleOutletStock()`, `useLiveOrdersQuery()`).
- **React Components**: Use `PascalCase` (`MenuCard.tsx`, `ItemModifierModal.tsx`, `KdsOrderBoard.tsx`, `StockSwitchTable.tsx`).
- **Backend Domain Files**: Split each module into `<domain>.routes.ts`, `<domain>.validator.ts`, `<domain>.controller.ts`, `<domain>.service.ts`, `<domain>.repository.ts`, and `<domain>.dto.ts` (for public modules).
- **Business IDs**: Never expose sequential DB integers (`1, 2, 3`) and never compute IDs with `COUNT(*) + 1`. Generate `OUT...`, `USR...`, `ORD...`, `TXN...`, `QR...`, `SYNC...` server-side inside transactions via PostgreSQL sequences (`nextval`).

## 4. Security & OWASP Defense Rules
- Never trust client-supplied prices, discounts, user roles, outlet IDs, or payment verification flags.
- Enforce Zod validation on both frontend forms and backend request handlers.
- Always parameterize PostgreSQL queries (`$1, $2`); never concatenate variables into SQL.
- Enforce IDOR protection on all private endpoints: `if (user.role !== 'MD' && user.outletId !== targetOutletId) return 403`.
- Sanitize all `/api/v1/Public/*` JSON outputs through explicit DTO mappers.
- Never use `dangerouslySetInnerHTML`.
- Apply strict IP rate limiting on `/api/v1/Public/Order/CreatePublicOrder`, `SendCustomerOtp` / `VerifyCustomerOtp`, and `/api/v1/Private/Auth/Login`.
- Never commit `.env` files, API keys, or credentials into this directory.
