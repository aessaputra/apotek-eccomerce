import { useCallback, useEffect, useRef, useState } from 'react';

export function useOfflineActionMessage(timeoutMs = 3000) {
  const [offlineActionState, setOfflineActionState] = useState({
    message: null as string | null,
    version: 0,
  });
  const offlineMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offlineActionMessage = offlineActionState.message;
  const offlineActionVersion = offlineActionState.version;

  const setOfflineActionMessage = useCallback((message: string | null) => {
    setOfflineActionState(previous => ({
      message,
      version: previous.version + 1,
    }));
  }, []);

  useEffect(() => {
    if (offlineMessageTimerRef.current) {
      clearTimeout(offlineMessageTimerRef.current);
      offlineMessageTimerRef.current = null;
    }

    if (!offlineActionMessage) {
      return;
    }

    const restartVersion = offlineActionVersion;

    offlineMessageTimerRef.current = setTimeout(() => {
      if (restartVersion < 0) {
        return;
      }

      setOfflineActionMessage(null);
      offlineMessageTimerRef.current = null;
    }, timeoutMs);

    return () => {
      if (offlineMessageTimerRef.current) {
        clearTimeout(offlineMessageTimerRef.current);
        offlineMessageTimerRef.current = null;
      }
    };
  }, [offlineActionMessage, offlineActionVersion, setOfflineActionMessage, timeoutMs]);

  const showOfflineActionMessage = useCallback(
    (message: string) => {
      setOfflineActionMessage(message);
    },
    [setOfflineActionMessage],
  );

  return {
    offlineActionMessage,
    setOfflineActionMessage,
    showOfflineActionMessage,
  };
}
