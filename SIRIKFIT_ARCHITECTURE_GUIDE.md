# SIRIKFIT Architectural Architecture & Synchronization Guide

## Executive Overview
SIRIKFIT utilizes a high-resiliency **3-Step Local-First State Pipeline** designed specifically for serverless deployments (Firebase Cloud Functions / Cloud Run) and web applications.

This architecture solves cold-start latency, cloud function timeouts, read-only file system restrictions, and race conditions by maintaining a single, immutable hierarchy for application settings, AED exchange rates, and CMS configurations.

---

## 1. Core Data Flow & Persistence Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN UI / INPUT FORM                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
            Step 1: Synchronous Local Storage Write
                               │
                               ▼
     ┌───────────────────────────────────────────────────┐
     │  localStorage.setItem('sirikfit_aed_rate', ...)   │
     │  localStorage.setItem('sirikfit_cms_config',...)  │
     └─────────────────────────┬─────────────────────────┘
                               │
            Step 2: Instant Custom Event Dispatch
                               │
                               ▼
     ┌───────────────────────────────────────────────────┐
     │ window.dispatchEvent(new CustomEvent(             │
     │   'settingsUpdated', { detail: payload }          │
     │ ));                                               │
     └─────────────────────────┬─────────────────────────┘
                               │
            Step 3: Direct Asynchronous Cloud Persistence
                               │
                               ▼
     ┌───────────────────────────────────────────────────┐
     │ Firestore setDoc(doc(db, 'settings', 'app'), ...) │
     │ Firestore setDoc(doc(db, 'settings', 'cms'), ...) │
     └───────────────────────────────────────────────────┘
```

### Step 1: Immediate Synchronous Local Persistence
- Whenever settings or AED exchange rates are modified in `AdminPanel.tsx` or `PricingRulesAdmin.tsx`, all numbers are safely sanitized using `parseFloat()` / `Number()`.
- Inputs are immediately saved to `localStorage` under standard keys:
  - `sirikfit_aed_rate`
  - `sirikfit_financial_settings`
  - `sirikfit_cms_config`
  - `sirikfit_features_config`

### Step 2: Instant Global Component Notification
- After updating `localStorage`, the save helper fires a custom window event:
  `window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: payload }))`
- React components (such as `App.tsx`, `Header.tsx`, `HeroCalculator.tsx`, and `PricingRulesAdmin.tsx`) listen to this event and update their local React state synchronously without needing a page refresh or API call.

### Step 3: Direct Firestore Cloud Sync
- The application bypasses local file system writes (`fs.writeFileSync`) in cloud environments (`process.env.K_SERVICE` / Firebase Cloud Functions) because Cloud Functions containers have a read-only filesystem (except `/tmp`).
- Writes are executed directly via the Firebase Web SDK (`setDoc(doc(db, 'settings', 'app'), ...)`), ensuring multi-device synchronization and production domain compatibility (`sirikfit.ir`).

---

## 2. Page Initialization & Hydration Protocol

When a user opens the application or refreshes the browser, `App.tsx` follows this strict priority order:

1. **Local State Hydration (Source of Truth)**:
   - `settings` state in `App.tsx` reads `sirikfit_aed_rate` and `sirikfit_financial_settings` from `localStorage` **first**.
   - UI elements (including the Header exchange rate badge and Calculator) render instantly with saved rates, preventing UI flickering or resetting to default hardcoded fallback values.

2. **Real-time Firestore Listener (`onSnapshot`)**:
   - `App.tsx` subscribes to real-time updates on `settings/app`, `settings/cms`, and `settings/general`.
   - When updates are received, `App.tsx` merges the remote changes while preserving local non-zero rates.

3. **Resilient Backend Fallback**:
   - If Cloud Functions timing out or network failure occurs, the app gracefully operates using `localStorage` cache without throwing errors or breaking UI state.

---

## 3. Serverless Backend (`server.ts`) Design Rules

1. **Read-Only File System Guard**:
   - In cloud environments (`process.env.K_SERVICE` or Firebase Cloud Functions), `server.ts` uses `defaultData` in-memory fallback and never attempts `fs.writeFileSync` or `fs.mkdirSync` on the container filesystem outside `/tmp`.
2. **Analytics Tracking (`/api/analytics/track-visit`)**:
   - The analytics tracking endpoint records visit logs in memory and updates Firestore `analytics_daily` collections asynchronously.
   - It returns a clean `200 OK` response without touching local disk.

---

## 4. Troubleshooting & Maintenance Checklist

If AED rate or CMS settings ever fail to update in the future, follow this step-by-step diagnostic checklist:

### Issue A: AED Rate Resets to Default or Doesn't Save
1. **Check LocalStorage in Browser DevTools**:
   - Open Console -> Application -> Local Storage.
   - Verify if `sirikfit_aed_rate` contains the numeric value (e.g. `53000`).
2. **Check String-to-Number Parsing**:
   - Verify that inputs in admin panels convert Persian/Arabic digits to English digits using `normalizeToEnglishDigits()` before running `parseFloat()`.
3. **Verify Event Listener Registration**:
   - Ensure `App.tsx` has attached the `settingsUpdated` listener on mount (`window.addEventListener('settingsUpdated', ...)`).

### Issue B: Backend 500 Internal Server Errors in Firebase Logs
1. **Check Filesystem Operations**:
   - Ensure no new endpoint in `server.ts` uses `fs.writeFileSync()` on relative root paths (`./data`). All cloud filesystem operations must target `/tmp` or check `isCloudEnv`.
2. **Check Firestore Rules & Config**:
   - Verify `firebase-applet-config.json` is deployed and Firestore database permissions allow read/write access to the `settings` collection.

---

## 5. Key Architecture Files
- `src/App.tsx`: Central state brain, local-first initialization & real-time Firestore listeners.
- `src/utils/adminSaveHelper.ts`: Unified 3-step save executor (`saveAdminSettingsPayload`).
- `src/components/AdminPanel.tsx`: Products & CMS management panel.
- `src/components/PricingRulesAdmin.tsx`: AED rate, commission rules, and shipping configuration panel.
- `server.ts`: Serverless Express API & Firebase Cloud Function entrypoint.
