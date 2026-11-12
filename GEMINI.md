# Sharon Tea & Coffee — Contactless Multi-Outlet QR Ordering Platform

> [!IMPORTANT]
> **MANDATORY PRE-CREATE RULE (READ DOCS FIRST BEFORE WRITING CODE)**  
> Whenever an AI agent is asked to create, scaffold, modify, or build **anything** inside `D:\LOTUS\contactless_order`, you **MUST FIRST READ** the specification documents in `docs/` **before writing a single line of code or creating any folder/file**:
> 1. Always read **[docs/06_API_NAMING_AND_DEVELOPER_SPEC.md](docs/06_API_NAMING_AND_DEVELOPER_SPEC.md)** and **[docs/02_PHASE_PROMPTS_AND_ARCHITECTURE.md](docs/02_PHASE_PROMPTS_AND_ARCHITECTURE.md)** first.
> 2. Read **[docs/01_PROJECT_SCOPE_AND_PLAN.md](docs/01_PROJECT_SCOPE_AND_PLAN.md)** for folder structure & scope, **[docs/03_UI_DESIGN_AND_STITCH_PROMPT.md](docs/03_UI_DESIGN_AND_STITCH_PROMPT.md)** for UI/UX design, **[docs/04_DEMO_UPI_TO_PROD_PAYMENT_FLOW.md](docs/04_DEMO_UPI_TO_PROD_PAYMENT_FLOW.md)** for UPI/PG payment logic, and **[docs/05_CONTEXT_AND_CHAT_REFERENCE.md](docs/05_CONTEXT_AND_CHAT_REFERENCE.md)** for main-website integration context.
> 3. **Zero Ad-Hoc Deviation**: Every folder name, file name (`*.controller.ts`, `*.service.ts`, etc.), `PascalCase` API route (`/api/v1/Public/...`, `/api/v1/Private/...`), `camelCase` function, PostgreSQL `nextval` Business ID (`ORD...`, `TXN...`), UTC timestamp rule, and DTO allowlist MUST strictly follow these docs. If an existing instruction is missing or ambiguous, stop and ask before inventing.

Welcome AI Agent. You are operating inside the **`sharon-contactless-ordering`** workspace (`D:\LOTUS\contactless_order`).

This project is an **independent, decoupled Contactless QR Multi-Outlet Ordering System** for Sharon Tea & Coffee. Read the documentation in `docs/` before generating code.

---

## 1. Quick Orientation & Documentation Map

Read these files in order based on your task:
1. **[docs/01_PROJECT_SCOPE_AND_PLAN.md](docs/01_PROJECT_SCOPE_AND_PLAN.md)** — Full project scope, folder structure, subdomains, in/out-of-scope, and Phase 1–8 execution roadmap.
2. **[docs/02_PHASE_PROMPTS_AND_ARCHITECTURE.md](docs/02_PHASE_PROMPTS_AND_ARCHITECTURE.md)** — Complete PostgreSQL DDL, Socket.io protocol, Menu Sync Engine, and Phase 1–8 build prompts.
3. **[docs/03_UI_DESIGN_AND_STITCH_PROMPT.md](docs/03_UI_DESIGN_AND_STITCH_PROMPT.md)** — Official Sharon brand color palette, Glassmorphism + Border Radius tokens, and screen-by-screen Stitch AI UI design prompts.
4. **[docs/04_DEMO_UPI_TO_PROD_PAYMENT_FLOW.md](docs/04_DEMO_UPI_TO_PROD_PAYMENT_FLOW.md)** — Small-shop Demo UPI Intent / Dynamic QR pilot flow (`paytm.s211ne7@pty`) and clean Pluggable Adapter upgrade path to Razorpay / Cashfree.
5. **[docs/05_CONTEXT_AND_CHAT_REFERENCE.md](docs/05_CONTEXT_AND_CHAT_REFERENCE.md)** — Reference back to the main Sharon Website platform, live menu API (`https://api.sharonteastall.com/api/v1/Product/GetPublicProducts`), outlets list, and planning conversation history.
6. **[docs/06_API_NAMING_AND_DEVELOPER_SPEC.md](docs/06_API_NAMING_AND_DEVELOPER_SPEC.md)** — Complete `TECH_STACK_MASTER.md` developer spec: Sharon PascalCase API inventory, `camelCase` function & domain file structure, sequence-based Business IDs (`ORD`, `TXN`, `USR`, `OUT`, `QR`, `SYNC`), full Route/System Error inventory, JSON request/response contracts, seed separation & `.env.example`.

---

## 2. Origin & Planning Conversation Reference

If you need deeper historical context or earlier business decisions from the planning session:
- **Antigravity Conversation ID**: `b28906ad-7682-4b3e-bf65-4c6eaa71916e`
- **Transcript Link**: `[Sharon Planning Session](conversation://b28906ad-7682-4b3e-bf65-4c6eaa71916e)`
- **Local Transcript Log**: `C:\Users\Admin\.gemini\antigravity\brain\b28906ad-7682-4b3e-bf65-4c6eaa71916e\.system_generated\logs\transcript.jsonl`
- **Master Tech & Security Reference**: `D:\LOTUS\Project Stack\Advanced\TECH_STACK_MASTER.md` and `D:\LOTUS\Project Stack\Advanced\security.txt`
- **Main Corporate Website Repo**: `D:\LOTUS\Sharon pr\sharon-website` (separate EC2 & DB — DO NOT modify or share its DB).

---

## 3. Non-Negotiable Architecture & Security Rules

1. **Decoupled Infrastructure & Subdomains**:
   - Customer App (`apps/order`) → `https://order.sharonteastall.com`
   - MD & Staff Portal (`apps/dashboard`) → `https://dashboard.sharonteastall.com`
   - Backend (`services/contactless-api`) runs on its **own separate EC2 instance** and **own separate PostgreSQL DB** (`sharon_contactless_db`).
   - Sync official beverage menus via REST API ONLY (`GET https://api.sharonteastall.com/api/v1/Product/GetPublicProducts`).
2. **State Ownership (React)**:
   - **TanStack Query (`@tanstack/react-query`)** exclusively for all server/API state.
   - **Zustand** strictly for client/UI-only state (transient cart, modal state, mute toggle). Never mirror API responses into Zustand.
3. **Canonical Timezone & Single-Page Dual-Copy DB Schema Standard**:
   - PostgreSQL stores **strict UTC (`TIMESTAMPTZ`)** (`SET TIME ZONE 'UTC'`).
   - Maintain **two single-page SQL files** (no `001`/`002`/`003` chain): `schema.production.sql` (clean complete `CREATE TABLE IF NOT EXISTS` only) and `schema.development.sql` (includes `ALTER TABLE ... IF NOT EXISTS`). **Any UI/API/DB column addition in `schema.development.sql` MUST also be added inside `schema.production.sql` in the exact same change.**
   - APIs return strict ISO 8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`). Frontends convert UTC dynamically to `Asia/Kolkata` (IST) via `Intl.DateTimeFormat`. Never store IST in the DB.
4. **Public vs. Private API Separation & Naming Standard**:
   - Follow Sharon's `PascalCase` endpoint standard (`/api/v1/Public/<Module>/<Action>`, `/api/v1/Private/<Module>/<Action>`), `camelCase` functions (`createPublicOrder`, `toggleOutletStock`), and PostgreSQL sequence Business IDs (`ORD...`, `TXN...`, `USR...`, `OUT...`, `QR...`, `SYNC...`) defined in `docs/06_API_NAMING_AND_DEVELOPER_SPEC.md`.
   - `/api/v1/Public/*`: Sanitized DTOs only. Never leak internal costs, margins, staff emails, scan analytics, or secrets.
   - `/api/v1/Private/*`: Strict JWT auth + Role-Based Access Control (`MD` vs. `OUTLET_STAFF`) + IDOR/BOLA `outlet_id` checks.
5. **Zero-Polling Real-Time (Socket.io)**:
   - All order notifications (`order:new` with audio chime 🔔), status updates (`order:status_updated`), and stock toggles (`outlet:stock_changed`) MUST use Socket.io rooms (`outlet_{id}`, `order_{id}`, `admin:all`). Never use `setInterval` polling.
6. **Payment Integrity (Never Trust Client)**:
   - Server always computes totals from DB prices. Never allow frontend to submit price or mark `PAID_VERIFIED`. Keep `UPI_CLAIMED_DEMO` strictly separate from `PAID_VERIFIED`.
7. **Secrets Hygiene**:
   - Never hardcode passwords, JWT secrets, AWS keys, or API keys in source code or documentation.
