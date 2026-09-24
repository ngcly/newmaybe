import { useCallback, useEffect, useRef } from 'react';

/** Own the request, its cancellation, and permission to update the current session. */
export function useRequestSession() {
  const active = useRef<AbortController | null>(null);
  const cancel = useCallback(() => {
    active.current?.abort();
    active.current = null;
  }, []);
  useEffect(() => cancel, [cancel]);

  const begin = useCallback(() => {
    if (active.current) return null;
    const controller = new AbortController();
    active.current = controller;
    const isCurrent = () => active.current === controller && !controller.signal.aborted;
    return {
      signal: controller.signal,
      isCurrent,
      finish: () => {
        if (!isCurrent()) return false;
        active.current = null;
        return true;
      },
    };
  }, []);

  return { begin, cancel };
}
