/** Simulated network delay so loading states are visible in the demo. Zero under Jest. */
const DEMO_LATENCY_MS = 350;

export function simulateLatency(ms: number = DEMO_LATENCY_MS): Promise<void> {
  const delay = process.env.NODE_ENV === 'test' ? 0 : ms;
  return new Promise((resolve) => setTimeout(resolve, delay));
}
