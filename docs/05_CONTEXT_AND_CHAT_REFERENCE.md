# 05 — Business Context, Live Menu API & Origin Chat Reference

---

## 1. Origin Planning Session Reference
If any AI agent or developer needs full historical decisions, background details, or reasoning from the planning phase:

- **Antigravity Conversation ID**: `b28906ad-7682-4b3e-bf65-4c6eaa71916e`
- **Conversation Reference URI**: `[Sharon Planning Chat](conversation://b28906ad-7682-4b3e-bf65-4c6eaa71916e)`
- **Local Transcript Path**: `C:\Users\Admin\.gemini\antigravity\brain\b28906ad-7682-4b3e-bf65-4c6eaa71916e\.system_generated\logs\transcript.jsonl`

---

## 2. Connected Master Standards & Sibling Platform

- **Engineering & Security Master Standards**:
  - `D:\LOTUS\Project Stack\Advanced\TECH_STACK_MASTER.md`
  - `D:\LOTUS\Project Stack\Advanced\security.txt`
- **Existing Corporate Website & Retail Storefront** *(Separate Infrastructure — Do NOT modify or share its DB)*:
  - Local Workspace: `D:\LOTUS\Sharon pr\sharon-website`
  - Public Site: `https://www.sharonteastall.com`
  - Admin Site: `https://admin.sharonteastall.com`
  - Backend REST API: `https://api.sharonteastall.com`

---

## 3. Official Live Menu Sync Endpoint (Verified `HTTP 200`)

The Contactless System fetches the master beverage catalog exclusively over HTTPS REST from the main platform:

- **Endpoint**: `GET https://api.sharonteastall.com/api/v1/Product/GetPublicProducts`
- **Verified Payload Structure** *(55 Official Beverage Items across 7 Categories)*:
  ```json
  {
    "id": "87bbc7fe-ea4f-497a-b92f-52137cca2e68",
    "categoryId": "7e34eb79-1063-4bcf-808e-23c643d328db",
    "categoryName": "Teas",
    "categorySlug": "teas",
    "name": "Sharon Classic",
    "slug": "teas-sharon-classic",
    "description": "Our signature everyday rich spiced milk tea",
    "shortDescription": "Our signature everyday rich spiced milk tea",
    "price": 20,
    "imageUrl": "https://sharon-tea-media.s3.ap-south-1.amazonaws.com/images/menu-items/teas-sharon-classic.jpg",
    "isAvailable": true,
    "isVegetarian": true,
    "isBestseller": true
  }
  ```

### Official 7 Categories & Item Breakdown (55 Total Items)
1. **Teas (17 items)**: Sharon Classic (₹20), Masala, Ginger, Elaichi, Pepper, Cinnamon, Tulsi, Jaggery, Irani, Spiced Duos, Chocolate, Saffron.
2. **Black Teas (8 items)**: Black Tea (₹15), Lemon, Black Ginger, Black Elaichi, Pepper Lemon, Ginger Lemon, Honey Lemon, Honey Ginger Lemon.
3. **Milk Specialties (5 items)**: Fresh Milk (₹20), Ginger Milk (₹25), Badam Milk (₹30), Horlicks (₹30), Boost (₹30).
4. **Coffee Specialties (6 items)**: Black Coffee (₹20), Filter Coffee (₹25), Ginger Coffee (₹30), Pepper Coffee, Chukku Coffee Milk, Chukku Coffee Black.
5. **Cold Menu (5 items)**: Ice Lemon (₹50), Cold Badam Milk (₹70), Cold Coffee (₹70), Cold Boost (₹70), Rose Milk (₹70).
6. **Herbal Teas (10 items)**: Green Tea (₹30), Tulsi, Green Lemon, Green Ginger, Tulsi Lemon, Tulsi Ginger, Gastric, Purple Tea, Hibiscus, Butterfly Pea.
7. **Add-ons & Customisations (4 items)**: Honey (+₹10), Lemon (+₹5), Jaggery (+₹5), Any Customisation (+₹5).
*(Plus branch snacks/upsell items such as Osmania Butter Biscuit ₹10, Bun Maska ₹35, Crispy Samosa ₹20 stored in Contactless DB.)*

---

## 4. Official Bengaluru Store Outlets (Initial Seed)
1. **Indiranagar Flagship** (`slug: indiranagar`): 100ft Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038
2. **New Thippasandra** (`slug: new-thippasandra`): 80ft Road, New Thippasandra, Bengaluru, Karnataka 560075
3. **Kaggadasapura** (`slug: kaggadasapura`): Main Road, Kaggadasapura, C V Raman Nagar, Bengaluru, Karnataka 560093
- **Operations / Franchise Contact**: `+91 99169 99209`
