export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production' 
  ? true 
  : typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

/**
 * Structured runtime logger that suppresses verbose debug/info messages in production
 * while preserving warnings and errors for diagnostics.
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

  public warn(...args: unknown[]): void {
    console.warn('[WARN]', ...args);
  }

  public error(...args: unknown[]): void {
    console.error('[ERROR]', ...args);
  }
}

export const logger = new Logger();
