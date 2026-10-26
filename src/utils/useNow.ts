import { useEffect, useState } from 'react';

/**
 * The current time, refreshed every `intervalMs`. Keeps render pure (no Date.now() during render) while
 * relative times ("10 min ago") and auto-captured times ("19:58 · auto") stay current.
 */
export function useNow(intervalMs: number = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}