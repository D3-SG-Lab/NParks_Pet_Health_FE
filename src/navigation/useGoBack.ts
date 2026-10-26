import { useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';

/**
 * Back action that never dead-ends: goes back when there is history (the normal case),
 * otherwise replaces with `fallback` (for example after a web refresh or a deep link).
 */
export function useGoBack(fallback: Href) {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  }, [router, fallback]);
}
