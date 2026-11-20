import { logger } from './logger';

export interface ErrorReportEntry {
  id: string;
  timestamp: string;
  version: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  userAgent: string;
}

const STORAGE_KEY = 'project_p_error_log';
const MAX_STORED_ERRORS = 20;
let initialized = false;

function getAppVersion(): string {
  try {
    return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.33.0';
  } catch {
    return '1.33.0';
  }
}

export function getRecentErrors(): ErrorReportEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearErrorLog(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function reportError(error: unknown, context?: Record<string, unknown>): ErrorReportEntry {
  const errObj = error instanceof Error ? error : new Error(String(error));
  const entry: ErrorReportEntry = {
    id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    version: getAppVersion(),
    message: errObj.message || 'Unknown error',
    stack: errObj.stack?.slice(0, 1500),
    context,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
  };

  logger.error('[Telemetry]', entry.message, context || '');

  try {
    const prev = getRecentErrors();
    const next = [entry, ...prev].slice(0, MAX_STORED_ERRORS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}

  // Optional production telemetry endpoint (Sentry / custom webhook via VITE_ERROR_REPORTING_ENDPOINT)
  const endpoint = import.meta.env?.VITE_ERROR_REPORTING_ENDPOINT as string | undefined;
  if (endpoint && typeof window !== 'undefined') {
    try {
      const body = JSON.stringify(entry);
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
      } else {
        void fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true
        }).catch(() => {});
      }
    } catch {}
  }

  return entry;
}

export function initGlobalErrorHandlers(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('error', event => {
    reportError(event.error || event.message, {
      source: 'window.onerror',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  window.addEventListener('unhandledrejection', event => {
    reportError(event.reason, { source: 'unhandledrejection' });
  });
}
