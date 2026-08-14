# SIRIKFIT Architectural & State Synchronization Guide

## 1. Overview & Core Architecture
SIRIKFIT operates on a resilient **Offline-First & LocalStorage-Primary** state management model paired with **Realtime Firebase Firestore SDK Synchronization** and a **Serverless/Cloud Function-Safe Express Backend**.

```
┌─────────────────────────────────────────────────────────────┐
│                      ADMIN PANEL / UI                       │
└──────────────────────────────┬──────────────────────────────┘
                               │
               1. Save to LocalStorage (Instant)
                               │
               2. window.dispatchEvent('settingsUpdated')
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────┐             ┌───────────────────────┐
│     Global State      │             │     Async Network     │
│   (React / Header)    │             │ (Firestore & Backend) │
└───────────────────────┘             └───────────────────────┘
```

---

## 2. The 3-Step Save Sequence (Bulletproof Pattern)
Whenever settings, AED exchange rates, pricing rules, or CMS items are saved in the Admin Panel (`adminSaveHelper.ts` / `PricingRulesAdmin.tsx` / `AdminPanel.tsx`), the application strictly executes in this order:

1. **Step 1: Synchronous LocalStorage Persistence (Immediate Source of Truth)**
   - All string numeric values are sanitized using `safeParseNumeric(val)` to prevent `NaN` or type comparison bugs.
   - Values are immediately stored in keys:
     - `sirikfit_aed_rate`
     - `sirikfit_financial_settings`
     - `sirikfit_app_settings`
     - `sirikfit_cms_config`
     - `omex_pricing_rules`
2. **Step 2: Synchronous Event Dispatch (Zero UI Lag)**
   - Dispatches `window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: payload }))` and `window.dispatchEvent(new Event('storage'))`.
   - `App.tsx` and all consumers instantly re-render with new values without waiting for network requests.
3. **Step 3: Asynchronous Firebase Firestore & Non-Blocking REST Sync**
   - Calls Firestore SDK `setDoc(doc(db, 'settings', 'app'), ...)` and `setDoc(doc(db, 'settings', 'general'), ...)`.
   - Fires a non-blocking background fetch to `/api/settings`.

---

## 3. Application Initialization (`src/App.tsx`)
On initial page load or hard refresh:
1. `useState` initializers read from `localStorage` **FIRST**.
2. If `localStorage` contains an AED rate or financial configuration, it is used immediately.
3. Hardcoded defaults (e.g., `55,000` Tomans) are ONLY used if `localStorage` and Firestore are completely empty.
4. Active Firestore `onSnapshot` listeners update the state if remote database changes occur.

---

## 4. Serverless & Cloud Function Safety (`server.ts`)
Firebase Cloud Functions and Cloud Run run in a **Read-Only** environment:
- `server.ts` checks `isCloudEnv` (`process.env.K_SERVICE || process.env.FUNCTION_TARGET`).
- In Cloud environments, write operations do NOT write to `./data` (which throws `EROFS` 500 errors).
- All analytics tracking (`/api/analytics/track-visit`) writes in-memory or directly to Firestore with silent fallbacks, ensuring 200 OK responses.

---

## 5. Troubleshooting & Debugging Guide

### Issue: "AED rate or settings did not update on the homepage after saving in Admin"
**Checks:**
1. Open Chrome DevTools > Application > Local Storage > inspect `sirikfit_aed_rate` and `sirikfit_financial_settings`.
2. Verify that the rate in LocalStorage is a valid positive number.
3. In Console, test event dispatch manually:
   ```javascript
   window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { aedRate: 54000 } }));
   ```
4. Verify Firestore document: Check the collection `settings` > doc `app` or `general` in Firebase Console.

### Issue: "500 Internal Server Error on API requests in Cloud Functions"
**Checks:**
1. Ensure the function does not attempt disk writes to relative paths like `./data`. Use `/tmp` or Firestore.
2. Check Cloud Function logs in Google Cloud Console / Firebase Console for `EROFS: read-only file system`.

### Issue: "FAQ or user inquiry not appearing in Firestore"
**Checks:**
1. Check `faqs` and `user_inquiries` collections in Firestore.
2. Verify `firestore.rules` allows read/write access for `faqs` and `user_inquiries`.
3. Check browser network tab for any blocked Firestore gRPC requests.
