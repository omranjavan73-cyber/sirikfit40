# Sirikfit System Architecture & Debugging Guide

Welcome to the definitive architecture and operational reference for **Sirikfit** (Dubai-to-Iran E-Commerce & Supplement Forwarding Platform). This document details data flows, persistence mechanisms, serverless safety guidelines, and step-by-step troubleshooting procedures.

---

## 1. System Architecture Overview

```
 ┌─────────────────────────────────────────────────────────────┐
 │                      Client (React SPA)                     │
 │                                                             │
 │  ┌──────────────────┐    CustomEvent     ┌───────────────┐  │
 │  │   Admin Panel    │ ─────────────────> │ Global Header │  │
 │  │ / Pricing Rules  │  'settingsUpdated' │   & Modals    │  │
 │  └────────┬─────────┘                    └───────────────┘  │
 │           │                                                 │
 │           ▼ LocalStorage First                              │
 │  ┌───────────────────────────────────────────────────────┐  │
 │  │ Keys: 'sirikfit_aed_rate', 'sirikfit_financial_...',  │  │
 │  │       'sirikfit_cms_config', 'omex_cart_items'        │  │
 │  └────────────────────────┬──────────────────────────────┘  │
 └───────────────────────────┼─────────────────────────────────┘
                             │ Direct Firebase SDK / REST
                             ▼
 ┌─────────────────────────────────────────────────────────────┐
 │               Backend & Cloud Infrastructure                │
 │                                                             │
 │   Firestore Database         Serverless API (server.ts)     │
 │   - settings/aed_rate        - /api/parse-link              │
 │   - settings/pricing_rules   - /api/scrape-product          │
 │   - settings/cms_config      - /api/analytics/track-visit   │
 │   - scraped_products_cache                                  │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Global State & Settings Synchronization

### The Problem Solved
Previously, settings like the AED exchange rate or Iran warehouse display toggles were prone to being overwritten upon page reload when the server API took too long or timed out. Furthermore, settings input forms frequently stored numbers as strings, preventing calculation arithmetic from functioning.

### The Solution: LocalStorage-First Source of Truth
1. **Immediate Hydration:** `src/App.tsx` reads directly from `localStorage` before any network requests complete:
   - `sirikfit_aed_rate`
   - `sirikfit_financial_settings`
   - `sirikfit_cms_config`
2. **Synchronous Reactivity:**
   When an admin updates a setting, the sequence is:
   1. **Sanitize Types:** Coerce all numeric inputs via `parseFloat(String(val).replace(/,/g, '')) || defaultValue`.
   2. **Persist to LocalStorage:** Write to browser local storage synchronously.
   3. **Dispatch Unified Event:** Dispatch `window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { aedRate, settings, cms } }))`.
   4. **Update React State:** Listeners in `App.tsx` and header components update instantly without needing a page refresh.
   5. **Asynchronous Cloud Sync:** Directly write to Firestore or server API in the background.

---

## 3. Serverless & Cloud Functions Safety (`server.ts`)

### Read-Only Filesystem Guarantee
In Firebase Cloud Functions and Google Cloud Run environments (`process.env.K_SERVICE` or serverless containers), the filesystem root `./` is strictly read-only.
- **Never** write to `./data/settings.json` or local folders in production.
- All dynamic analytics (`/api/analytics/track-visit`) execute in-memory and return a clean `200 OK` JSON response.
- Product caching uses Firestore collection `scraped_products_cache` with MD5 URL hashing.

---

## 4. Multi-Tier Universal & Domain-Specific Scraper Pipeline

The scraper pipeline in `server.ts` extracts product information, gallery images, prices in AED, and variants (Flavors, Sizes, Servings) through five tiered stages:

```
  User Enters URL (Dr. Nutrition, Noon, Amazon, GNC, etc.)
                          │
                          ▼
            [ Check Domain & Normalization ]
                          │
                          ▼
        [ Firestore Cache: scraped_products_cache ] ──(Hit)──> Return Cached Product
                          │ (Miss)
                          ▼
      [ Tier 1: Direct SSR Fetch with Chrome 115 Headers ]
                          │
                          ├─> Extract Next.js __NEXT_DATA__ embedded JSON
                          ├─> Extract Schema.org JSON-LD (<script type="application/ld+json">)
                          └─> Extract Configurable Swatches & DOM
                          │
                          ▼ (If blocked or 0 price)
      [ Tier 2: Domain-Specific Adapters & JSON Endpoints ]
                          │ (.json / .js / catalog APIs)
                          ▼ (If protected)
      [ Tier 3: ScraperAPI Proxy Fallback ]
                          │
                          ▼ (If fails)
      [ Tier 4: Jina Reader Proxy Fallback (r.jina.ai) ]
                          │
                          ▼ (If raw text only)
      [ Tier 5: Gemini Flash AI Schema Extractor ]
                          │
                          ▼
             [ Sanitize & Save to Firestore Cache ]
                          │
                          ▼
               Return Clean JSON to Client
```

### Supported Scraper Headers
- **User-Agent:** `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36`
- **Accept-Language:** `en-US,en;q=0.9`

---

## 5. Multi-Variant Dynamic Price Matrix Architecture

### The Problem Solved
When e-commerce stores have multiple sizes or flavors with distinct pricing (e.g. 29 Servings = AED 199 vs. 68 Servings = AED 389.90), basic DOM scrapers often only capture the initial displayed price and assign it to all variant tags.

### The Solution: Embedded JSON Extraction & Store-Specific Adapters
1. **GNC & Shopify Stores:**
   - Any Shopify product URL (e.g. `https://gnc-mena.com/products/on-gold-standard`) is queried via its native `.js` endpoint: `url.split('?')[0] + '.js'`.
   - Returns a structured JSON payload containing `product.variants` with exact prices in cents (e.g. `38990` -> `389.90 AED`) and `compare_at_price`.
2. **Dr. Nutrition (Next.js Hydration & Sibling Products):**
   - Dr. Nutrition uses URL-based variants where changing size/flavor navigates between sibling URL slugs.
   - `DrNutritionAdapter.ts` traverses `<script id="__NEXT_DATA__">` deeply to extract linked sibling products, configurable options, and prices.
   - Sibling `<a>` selectors and swatches are extracted with their relative URLs, allowing full matrix navigation and accurate dynamic pricing.
3. **Unified `ProductVariantMatrix` Schema:**
   - `matrix.sizes`: String array of unique size names (e.g. `["2 LB", "5 LB"]` or `["29 Servings", "68 Servings"]`).
   - `matrix.flavors`: String array of unique flavor names (e.g. `["Vanilla Cream", "Milk Chocolate"]`).
   - `matrix.items`: Array of `ProductVariantItem` holding individual variant-specific `priceAED`, `originalPriceAED`, `image`, `url`, and `inStock`.
4. **Frontend Dynamic Reaction:**
   - `HeroCalculator`, `ProductDetailView`, and `ProductDetailModal` use `useMemo` to match the active flavor and size combination against `variantMatrix.items`.
   - The price updates instantly in real-time as the user clicks between variant pills or selects from dropdowns.

---

## 6. Cart Quantity Enforcement

- When a product is selected or added, the quantity strictly defaults to `1`.
- Any addition payload is bounded via `Math.max(1, Math.floor(product.quantity || 1))`.
- When users switch between products in `ProductDetailView` or open `ProductDetailModal`, the internal quantity state resets immediately to `1`.

---

## 6. Troubleshooting & Diagnostics Guide

| Issue | Root Cause | Solution Step |
|---|---|---|
| **AED Rate resets to 55,000 on refresh** | Server API timeout or missing LocalStorage key | Open DevTools -> Application -> Local Storage. Verify `sirikfit_aed_rate` is set. If not, update rate in Admin Panel once. |
| **Dr. Nutrition scraper returns "Require Manual Entry"** | Cloudflare / bot-protection blocking direct IP | Ensure `SCRAPER_API_KEY` is configured in Admin Panel -> API Keys or environment variables. |
| **Variants (Flavors / Sizes) not appearing** | Script tags sanitized or missing swatch attributes | Verify site uses Next.js `__NEXT_DATA__` or Shopify JSON. The parser will fallback to DOM regex scanning. |
| **500 Error on API route in Cloud Functions** | Writing to disk (`fs.writeFileSync`) in read-only environment | Ensure `server.ts` uses Firestore for persistent data or in-memory fallback. |
| **Cart opens with unexpected item quantity** | Unsanitized quantity payload from modal | Inspect `addToCart` payload in `App.tsx` and ensure `qtyToAdd` is strictly numeric. |

---

## 7. Global Error Boundary & Defensive Null-Safety

### Global Error Boundary & Corrupt State Recovery
To completely prevent blank/white screen crashes in the React preview and production environments, the application is wrapped in `<ErrorBoundary>` components:
- **Root Level (`main.tsx` & `App.tsx`):** Catches any unhandled React component lifecycle or render-time errors, rendering an informative fallback UI with error details, stack traces, and a one-click **"پاک‌سازی حافظه محلی و بازیابی (Reset App Data)"** button (`localStorage.clear(); window.location.reload();`) to recover from corrupt cached states.
- **Section Level (`TrustBadgesSection`, `Footer`, etc.):** Isolates volatile dynamic CMS/HTML parser sections so an error in a single section never unmounts the rest of the application.

### Defensive Null Safety & Regex Protection
1. **Bulletproof Enamad / Samandehi Parsers (`TrustBadgesSection.tsx` & `Footer.tsx`):** All regex operations (`.match()`, `.replace()`) are wrapped inside strict `try...catch` blocks and guarded with explicit `typeof === 'string' && length > 0` validation checks.
2. **Safe LocalStorage Engine (`src/utils/safeStorage.ts`):** `getSafeItem` and `setSafeItem` wrap all `JSON.parse` operations in `try...catch`, auto-clearing corrupt keys if unparseable and returning clean defaults.
3. **Formatters (`formatters.ts`):** `formatToman` and `formatAed` always coerce inputs safely via `Number(val) || 0` and return valid formatted strings for `null`, `undefined`, or `NaN`.
4. **Dynamic Rates (`Header.tsx`):** Safe casting ensures calculation properties like `dynamicRate` always resolve to positive numbers with fallback values.

---

## 8. Developer Cheatsheet

### Emitting Settings Update from any Component:
```ts
window.dispatchEvent(
  new CustomEvent('settingsUpdated', {
    detail: {
      aedRate: 58500,
      financialSettings: { /* ... */ },
      cmsConfig: { /* ... */ }
    }
  })
);
```

### Scraping a Link via API:
```bash
curl -X POST http://localhost:3000/api/parse-link \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.drnutrition.com/en-ae/product/optimum-nutrition-gold-standard-100-whey-protein"}'
```
