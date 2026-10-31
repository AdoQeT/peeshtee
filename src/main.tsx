import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

declare const __APP_VERSION__: string | undefined;

// Register Service Worker for offline playability & PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const ver = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1';
    navigator.serviceWorker.register(`./sw.js?v=${encodeURIComponent(ver)}`).catch(err => {
      console.warn('[PWA] Service worker registration failed:', err);
    });
  });
}
