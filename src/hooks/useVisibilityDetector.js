import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to detect when user switches apps on their phone
 * Uses Page Visibility API to detect when the app loses focus
 */
export function useVisibilityDetector() {
  const [isAppVisible, setIsAppVisible] = useState(true);
  const [appSwitchCount, setAppSwitchCount] = useState(0);
  const [lastVisibilityChangeTime, setLastVisibilityChangeTime] = useState(null);

  const handleVisibilityChange = useCallback(() => {
    const isVisible = !document.hidden;
    setIsAppVisible(isVisible);
    setLastVisibilityChangeTime(new Date());

    // Only increment counter when app loses focus
    if (!isVisible) {
      setAppSwitchCount((prev) => prev + 1);
    }
  }, []);

  useEffect(() => {
    // Check if Page Visibility API is supported
    if (typeof document.hidden === 'undefined') {
      console.warn('[v0] Page Visibility API not supported on this device');
      return;
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  return {
    isAppVisible,
    appSwitchCount,
    lastVisibilityChangeTime,
    isDistracted: !isAppVisible,
  };
}
