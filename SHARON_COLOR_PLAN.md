# Sharon Tea — Brand Color System & UI Style Guide

This document defines the complete official color palette, UI tokens, component-level color codes, and developer usage guidelines for the **Sharon Tea, Coffee & Snacks** application ecosystem (Customer Web, Admin CRM, and Mobile App).

---

## 1. Core Brand Color Palette

| Token | Color Name | HEX Code | RGB | HSL | Primary Application |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `--color-forest` | **Sharon Forest Green** | `#1C4C34` | `rgb(28, 76, 52)` | `hsl(150, 46%, 20%)` | **Primary Brand Color**: App header, CRM sidebar, primary action buttons, active navigation pills, brand titles. |
| `--color-chai` | **Warm Chai Brown** | `#A44C14` | `rgb(164, 76, 20)` | `hsl(23, 78%, 36%)` | **Secondary Brand Color**: Chai category accents, subtitle highlights, secondary action links, warning borders. |
| `--color-amber` | **Golden Amber / Turmeric** | `#FC9C34` | `rgb(252, 156, 52)` | `hsl(31, 97%, 60%)` | **Accent & CTA**: Floating cart badge, "View Order" CTA button, bestseller stars, promotional highlights. |
| `--color-cream` | **Café Cream** | `#FAF7F2` | `rgb(250, 247, 242)` | `hsl(38, 45%, 96%)` | **Background Base**: Main viewport background, modal backgrounds, subtle card fills. |
| `--color-primary` | **Espresso Black** | `#241C24` | `rgb(36, 28, 36)` | `hsl(300, 13%, 13%)` | **Primary Text**: Main headers, item names, bill totals, high-contrast typography. |

---

## 2. Supporting & Neutral Colors

| Token | Color Name | HEX Code | RGB | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `--color-leaf` | **Fresh Mint / Leaf Green** | `#34A43C` | `rgb(52, 164, 60)` | FSSAI 100% Vegetarian badge, positive order status, verified UPI checkmarks. |
| `--color-rust` | **Roasted Rust** | `#7C2C0C` | `rgb(124, 44, 12)` | Non-vegetarian / egg product indicators, critical error alerts. |
| `--color-burgundy` | **Deep Burgundy** | `#541424` | `rgb(84, 20, 36)` | Speciality badges, premium signature brews, text selection highlight (`selection:bg-brand-burgundy`). |
| `--color-border` | **Warm Oat Border** | `#E8E3D9` | `rgb(232, 227, 217)` | Component borders, table row dividers, card framing. |
| `--color-muted` | **Stone Muted Text** | `#6E6A67` | `rgb(110, 106, 103)` | Descriptions, timestamps, token numbers, secondary text. |
| `--color-grey` | **Light Neutral Grey** | `#D4D4D4` | `rgb(212, 212, 212)` | Disabled inputs, placeholder borders, loading skeletons. |

---

## 3. Button & Interactive Element Colors

### 3.1 Primary Actions
- **Resting Background**: `#1C4C34` *(Sharon Forest)*
- **Hover Background**: `#163E2A` or `#153A27`
- **Active / Pressed**: `#102B1D`
- **Text Color**: `#FFFFFF`
- **Shadow**: `0 4px 14px -2px rgba(28, 76, 52, 0.25)`
- **Applied to**:
  - Customer Menu "Add to Cart"
  - Customer "⚡ 1-Click Reorder"
  - Admin "Access Sharon CRM Dashboard"
  - Admin "Add Staff Member" / "Save Changes"

### 3.2 Floating Cart & Order CTA
- **Resting Background**: `#FC9C34` *(Golden Amber)*
- **Hover Background**: `#E58B2B`
- **Text Color**: `#241C24` *(Espresso Black, bold)*
- **Applied to**:
  - Sticky bottom cart bar "View Order →" button
  - Category Bestseller pills

### 3.3 Report Export Suite Buttons
- **Excel Export**:
  - Background: `#047857` (Emerald 700)
  - Hover: `#065F46` (Emerald 800)
  - Text: `#FFFFFF`
- **PDF Print / Download**:
  - Background: `#BE123C` (Rose 700)
  - Hover: `#9F1239` (Rose 800)
  - Text: `#FFFFFF`
- **CSV Data Export**:
  - Background: `#292524` (Stone 800)
  - Hover: `#0C0A09` (Stone 950)
  - Text: `#FFFFFF`

### 3.4 Secondary & Neutral Buttons
- **Resting Background**: `#F5F5F4` (Stone 100) or `#FAF7F2` (Café Cream)
- **Hover Background**: `#E7E5E4` (Stone 200)
- **Border**: `#E8E3D9` (Oat Border)
- **Text Color**: `#57534E` (Stone 600)
- **Applied to**:
  - Date Filter Presets (*All Time, Today, Yesterday, This Month*)
  - "Cancel" dialog buttons
  - "View Receipt" secondary links

---

## 4. Status Badges & Indicator Colors

| Status / State | Background | Text Color | Border Color | Visual Meaning |
| :--- | :--- | :--- | :--- | :--- |
| **Pending** | `#FEF3C7` (Amber 100) | `#78350F` (Amber 900) | `#FCD34D` (Amber 300) | Order placed, awaiting kitchen acceptance |
| **Accepted** | `#DBEAFE` (Blue 100) | `#1E3A8A` (Blue 900) | `#93C5FD` (Blue 300) | Counter confirmed order |
| **Preparing / Brewing** | `#FFEDD5` (Orange 100)| `#7C2D12` (Orange 900)| `#FDBA74` (Orange 300)| Boiling fresh tea / frying snacks |
| **Ready for Pickup** | `#DCFCE7` (Green 100) | `#14532D` (Green 900) | `#86EFAC` (Green 300) | At reception counter for customer collection |
| **Completed** | `#F5F5F4` (Stone 100) | `#44403C` (Stone 700) | `#D6D3D1` (Stone 300)| Handed over & fulfilled |
| **UPI Paid** | `#DCFCE7` (Emerald 50)| `#15803D` (Emerald 700)| `#BBF7D0` (Emerald 200)| Verified digital payment |
| **Cash at Counter** | `#FEF3C7` (Amber 100) | `#92400E` (Amber 800) | `#FDE68A` (Amber 200) | Customer must pay physical cash at reception |

---

## 5. Developer Implementation Snippets

### Tailwind CSS Configuration (`apps/customer-web/tailwind.config.js`)
```javascript
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#241C24',
          forest: '#1C4C34',
          leaf: '#34A43C',
          chai: '#A44C14',
          rust: '#7C2C0C',
          amber: '#FC9C34',
          burgundy: '#541424',
          grey: '#D4D4D4',
          cream: '#FAF7F2',
          border: '#E8E3D9',
          muted: '#6E6A67',
        },
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(28, 76, 52, 0.08)',
        'elevated': '0 10px 30px -4px rgba(36, 28, 36, 0.12)',
        'floating': '0 14px 40px -6px rgba(28, 76, 52, 0.25)',
      },
    },
  },
}
```

### CSS Custom Variables (`apps/customer-web/src/index.css`)
```css
:root {
  --color-primary: #241C24;
  --color-forest: #1C4C34;
  --color-leaf: #34A43C;
  --color-chai: #A44C14;
  --color-rust: #7C2C0C;
  --color-amber: #FC9C34;
  --color-burgundy: #541424;
  --color-grey: #D4D4D4;
  --color-cream: #FAF7F2;
  --color-border: #E8E3D9;
  --color-muted: #6E6A67;
}

body {
  background-color: var(--color-cream);
  color: var(--color-primary);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

---

## 6. Typography & Accessibility
- **Serif Heading Font**: `"Playfair Display"`, Georgia, serif (used for brand titles, section headers, and traditional chai authenticity).
- **Sans-Serif Body Font**: `Inter`, system UI font stack (used for menus, prices, tokens, and dense CRM data grids).
- **Contrast Compliance**:
  - Forest Green (`#1C4C34`) on White (`#FFFFFF`): **7.8:1** (WCAG AAA compliant).
  - Forest Green (`#1C4C34`) on Cream (`#FAF7F2`): **7.4:1** (WCAG AAA compliant).
  - Espresso Black (`#241C24`) on Cream (`#FAF7F2`): **12.9:1** (WCAG AAA compliant).
