/** Simulated network delay so loading states are visible in the demo. Zero under Jest. */
const DEMO_LATENCY_MS = 350;

export function simulateLatency(ms: number = DEMO_LATENCY_MS): Promise<void> {
  const delay = process.env.NODE_ENV === 'test' ? 0 : ms;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Copies a mock response the way a network round trip would (JSON in, JSON out). The mock store is
 * edited in place, so returning its objects directly would hand screens the same references after a
 * change, and TanStack Query would see "no change" and skip the re-render.
 */
export function overTheWire<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}
