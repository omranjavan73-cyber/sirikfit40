import './firebase';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Force purge obsolete service workers and legacy caches
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

if ('caches' in window) {
  caches.keys().then(names => {
    for (const name of names) {
      caches.delete(name);
    }
  });
}

// Global App Build Version synchronization (forces client cache invalidation on new release)
const CURRENT_VERSION = "2026.09.05-v5-sync";
const savedVersion = localStorage.getItem("sirikfit_app_version");
if (savedVersion !== CURRENT_VERSION) {
  const authUser = localStorage.getItem("sirikfit_auth_user") || localStorage.getItem("sirikfit_user");
  localStorage.clear();
  sessionStorage.clear();
  if (authUser) {
    try { localStorage.setItem("sirikfit_auth_user", authUser); } catch (_) {}
  }
  localStorage.setItem("sirikfit_app_version", CURRENT_VERSION);
  if (savedVersion) {
    window.location.reload();
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary name="Root Application">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

