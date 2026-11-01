import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';

declare const __APP_VERSION__: string;

const CURRENT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.30.3';
const CHECK_INTERVAL_MS = 45000; // Check every 45s

export function useVersionChecker() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  const checkForUpdate = useCallback(async () => {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache'
        }
      });
      if (!res.ok) return;

      const data = await res.json();
      if (data && typeof data.version === 'string') {
        if (data.version !== CURRENT_VERSION) {
          logger.info(`New version detected: ${data.version} (current: ${CURRENT_VERSION})`);
          setHasUpdate(true);
          setLatestVersion(data.version);
        }
      }
    } catch {
      // Offline or network error; silently ignore
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkForUpdate();

    // Interval check
    const interval = window.setInterval(checkForUpdate, CHECK_INTERVAL_MS);

    // Check on tab focus / visibility change
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [checkForUpdate]);

  const reloadToUpdate = useCallback(() => {
    window.location.reload();
  }, []);

  return {
    hasUpdate,
    latestVersion,
    currentVersion: CURRENT_VERSION,
    reloadToUpdate
  };
}
