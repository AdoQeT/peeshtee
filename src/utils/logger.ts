export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev =
  (typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV)) ||
  (typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));

/**
 * Structured runtime logger that suppresses verbose debug/info/warn noise in production
 * while preserving critical errors for diagnostics.
 */
class Logger {
  public debug(...args: unknown[]): void {
    if (isDev) {
      console.debug('[DEBUG]', ...args);
    }
  }

  public info(...args: unknown[]): void {
    if (isDev) {
      console.info('[INFO]', ...args);
    }
  }

  public log(...args: unknown[]): void {
    if (isDev) {
      console.info('[INFO]', ...args);
    }
  }

  public warn(...args: unknown[]): void {
    if (isDev) {
      console.warn('[WARN]', ...args);
    }
  }

  public error(...args: unknown[]): void {
    console.error('[ERROR]', ...args);
  }
}

export const logger = new Logger();
