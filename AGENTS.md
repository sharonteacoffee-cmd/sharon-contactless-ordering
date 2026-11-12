# AI Agent Guide — Sharon Contactless Multi-Outlet QR Ordering (`D:\LOTUS\contactless_order`)

## Mandatory Rule Before Creating Any Code or Files

**STOP & READ DOCS FIRST:** Before creating any file, folder, API endpoint, SQL migration, or UI component in this workspace, you **MUST first read** [GEMINI.md](GEMINI.md) and the authoritative specification files in **`docs/`**, and follow every rule strictly without inventing ad-hoc conventions:

- **`docs/06_API_NAMING_AND_DEVELOPER_SPEC.md`** *(READ FIRST FOR CODE)* — Sharon `PascalCase` API inventory, `camelCase` function names, backend `Routes -> Validator -> Controller -> Service -> Repository` file structure, sequence-based Business IDs (`OUT`, `USR`, `ORD`, `TXN`, `QR`, `SYNC`), full Route & System Error page inventory, JSON request/response contracts, seed separation & `.env.example`
- **`docs/02_PHASE_PROMPTS_AND_ARCHITECTURE.md`** *(READ FIRST FOR DB & PHASES)* — PostgreSQL UTC Schema, Business ID sequences, Socket.io protocol, Menu Sync engine, and Turnkey Phase 1–8 Build Prompts
- **`docs/01_PROJECT_SCOPE_AND_PLAN.md`** — Monorepo folder layout, subdomains, in/out-of-scope rules, and Phase 1–8 roadmap
- **`docs/03_UI_DESIGN_AND_STITCH_PROMPT.md`** — Official Sharon brand palette, Glassmorphism + border-radius tokens, Stitch AI screen-by-screen prompts
- **`docs/04_DEMO_UPI_TO_PROD_PAYMENT_FLOW.md`** — Small-shop Demo UPI Intent / Dynamic QR flow (`paytm.s211ne7@pty`) & Production PG Migration (Razorpay/Cashfree)
- **`docs/05_CONTEXT_AND_CHAT_REFERENCE.md`** — Main website API reference (`api.sharonteastall.com`) & Origin Chat ID (`b28906ad-7682-4b3e-bf65-4c6eaa71916e`)
