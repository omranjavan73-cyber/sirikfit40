import './firebase';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// 1. Unregister any obsolete Service Workers caching old HTML
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

// 2. Clear stale CacheStorage buckets
if (typeof window !== 'undefined' && 'caches' in window) {
  caches.keys().then((names) => {
    for (const name of names) {
      caches.delete(name);
    }
  });
}

// 3. Build Version Check & Automatic Hard-Reload
const APP_BUILD_VERSION = "2026.08.22-v1";
if (typeof window !== 'undefined') {
  try {
    const storedVersion = localStorage.getItem("sirikfit_app_version");
    if (storedVersion !== APP_BUILD_VERSION) {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("sirikfit_app_version", APP_BUILD_VERSION);
      // Force clean reload bypass cache
      if (storedVersion) {
        window.location.reload();
      }
    }
  } catch (_e) {
    // Ignore storage errors in restricted contexts
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary name="Root Application">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

