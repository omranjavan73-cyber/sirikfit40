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

// Global App Build Version synchronization
const CURRENT_VERSION = "2026.09.04-v1";
const savedVersion = localStorage.getItem("sirikfit_app_version");
if (savedVersion !== CURRENT_VERSION) {
  localStorage.clear();
  sessionStorage.clear();
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

