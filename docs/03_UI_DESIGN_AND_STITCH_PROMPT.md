# 03 — Sharon Brand Color Palette, Glassmorphism Tokens & Stitch AI Prompt

---

## 1. Official Sharon Brand Color Palette

| Color Name | HEX | RGB | UI Role |
| :--- | :---: | :--- | :--- |
| **Sharon Burgundy / Maroon** | `#541424` | `rgb(84, 20, 36)` | Hero headers, primary buttons, active brand chips |
| **Sharon Forest Green** | `#1C4C34` | `rgb(28, 76, 52)` | Heritage credibility accents, dark studio stages |
| **Fresh Leaf Green** | `#34A43C` | `rgb(52, 164, 60)` | Veg dots, In-Stock indicators, verified payment green |
| **Spiced Chai Brown** | `#A44C14` | `rgb(164, 76, 20)` | Warm beverage borders, spice highlights |
| **Deep Tea Rust** | `#7C2C0C` | `rgb(124, 44, 12)` | Deep hover & accent contrast |
| **Golden Cardamom Amber** | `#FC9C34` | `rgb(252, 156, 52)` | Bestseller badges, incoming order pings |
| **Tea Charcoal Obsidian** | `#241C24` | `rgb(36, 28, 36)` | Primary body ink, dark frosted floating bars |
| **Steamed Milk Cream** | `#FAF7F2` | `rgb(250, 247, 242)` | App background canvas (replaces harsh white) |
| **Soft Neutral Grey** | `#D4D4D4` | `rgb(212, 212, 212)` | Subtle borders, divider hairlines |
| **Pure White** | `#FFFFFF` | `rgb(255, 255, 255)` | Elevated glass cards & inputs |

---

## 2. Glassmorphism & Border Radius Design System

- **Frosted Light Glass**: `bg-white/75 backdrop-blur-xl border border-white/45 shadow-[0_10px_30px_-5px_rgba(84,20,36,0.08)]`
- **Dark Frosted Glass (Floating Tray / Sticky Headers)**: `bg-[#241C24]/88 backdrop-blur-2xl border border-white/12 text-white`
- **Border Radii**:
  - Cards & Containers: `rounded-3xl` (`24px`)
  - Bottom Sheets / Drawers: `rounded-t-[32px]` (`32px`)
  - Image Frames: `rounded-2xl` (`16px`–`20px`)
  - Chips, Badges & Floating Pills: `rounded-full` (`9999px`)
- **Typography**: `Playfair Display` (Display headings) + `SoDo Sans` / `Inter` (Clean body & tabular prices `₹20`).

---

## 3. Master Stitch AI Prompt (`apps/order` Customer PWA Only)

Paste this prompt into **Google Stitch** (or via Stitch MCP tools `create_design_system` + `generate_screen_from_text`):

```markdown
Design a mobile-first Contactless QR Ordering Web Application (PWA) for "Sharon Tea & Coffee" (order.sharonteastall.com).
Use Apple iOS-inspired Frosted Glassmorphism (`backdrop-blur-xl`, translucent panels `rgba(255,255,255,0.75)`, hairline borders `rgba(255,255,255,0.45)`) and smooth modern border radii (`24px` cards, `32px` top-rounded bottom sheets, `9999px` pill buttons).

BRAND COLORS:
- Primary Accent: Sharon Burgundy (#541424)
- Secondary Accent: Forest Green (#1C4C34) & Fresh Leaf (#34A43C)
- Warm Highlight: Cardamom Amber (#FC9C34) & Spiced Chai (#A44C14)
- Background Canvas: Steamed Milk Cream (#FAF7F2)
- Dark Frosted Ink/Surfaces: Tea Charcoal Obsidian (#241C24)

SCREENS TO GENERATE:
1. SCREEN 1 — OUTLET WELCOME & LIVE MENU (/order/:outletSlug):
   - Sticky glass top bar: Sharon logo, "Sharon Tea & Coffee — Indiranagar Flagship", "Open Now • Closes 11 PM", pulsing green badge "Counter / Table #4".
   - Frosted search input + horizontal scrollable category pills (All Teas, Black Teas, Milk, Filter Coffee, Cold Menu, Herbal, Snacks). Active pill in #541424 Burgundy.
   - 2-column mobile grid of frosted `rounded-3xl` beverage cards: 4:5 studio photo, green veg dot, amber "Bestseller" tag, title, short description, bold `₹20`, and "+ Add" pill button. Include a "Sold Out Today" greyed card state.
   - Dark frosted floating bottom tray bar (`#241C24/90 backdrop-blur-2xl rounded-full`): "2 Items • ₹50" + "View Order Tray →".

2. SCREEN 2 — BEVERAGE CUSTOMIZER SHEET (Bottom Drawer Modal):
   - Rounded top `rounded-t-[32px]` frosted drawer with drag handle.
   - Sugar Level single-select glass chips: Normal Sugar (Default), Less Sugar, No Sugar, Organic Jaggery (+₹5).
   - Brew Strength multi-select chips: Standard, Kadak / Strong, Fresh Crushed Ginger (+₹5), Crushed Elaichi (+₹5).
   - Special instructions frosted input + quantity stepper + sticky Burgundy CTA "Add to Tray • ₹25".

3. SCREEN 3 — PRE-CHECKOUT UPSELL TRAY:
   - Horizontal frosted pairing cards titled "Pairs Best With Your Chai ☕": Osmania Butter Biscuit (₹10), Bun Maska (₹35), Crispy Hot Samosa (₹20) with 1-tap "+ Add" pills.

4. SCREEN 4 — CHECKOUT, VERIFICATION & DEMO UPI PAYMENT:
   - Tray line items showing modifiers clearly.
   - Glass Customer Info card: Name & 10-digit Mobile input (plus switchable OTP 4-digit box when OTP mode is enabled).
   - Payment cards: [Selected] "Pay via UPI (Paytm / GPay / PhonePe)" and "Pay Cash at Counter".
   - Inside UPI Payment modal/card: Prominent button "Open UPI App (₹50)" + Dynamic Scannable QR card + "I Have Completed Payment" button leading into a 3-second glassmorphic "Confirming Payment..." animation and success toast.

5. SCREEN 5 — LIVE ORDER TRACKER & COUNTER PASS (/order/status/:orderId):
   - Hero frosted Token Pass Card: `#SH-IND-101`, "₹50.00 Paid via UPI", Reference Note `Order SH-IND-101`, badge "Show at Counter / Verifying".
   - Vertical real-time progress stepper: Received → Brewing (amber steam glow) → Ready for Pickup (emerald celebration glow) → Delivered.
   - Live IST timestamp (`12:05 PM IST`) & live elapsed seconds counter (`Ordered 45s ago`).

6. GLOBAL FOOTER & DEVELOPER CREDITS (ALL APPS):
   - App Footer Bar: "© 2026 Sharon Tea & Coffee. All rights reserved. • Designed and Developed by Novacodex (https://novacodex.in)" with subtle amber/gold link hover.
```
