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

## 5. Cart Quantity Enforcement

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

## 7. Developer Cheatsheet

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
