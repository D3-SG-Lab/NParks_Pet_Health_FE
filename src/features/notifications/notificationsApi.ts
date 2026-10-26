/**
 * Push notifications (FE-019).
 *
 * MOCK: one demo push is generated from the store shortly after sign-in. OUTSTANDING: device
 * registration with expo-notifications, permission prompt, foreground/background handling and
 * unregistering on logout (BE-022). Push content must never include sensitive health data.
 */
import type { AppNotification } from '@/domain/types';
import { mockDb } from '@/mock/db';
import { simulateLatency } from '@/mock/latency';

/** A "Case reopened" push for the first reopened case, if there is one. */
export async function getDemoPush(now: number = Date.now()): Promise<AppNotification | null> {
  await simulateLatency(0);
  const reopened = mockDb.cases.find((c) => c.reopenedAt !== null && c.status !== 'closed');
  const animal = mockDb.animals.find((a) => a.id === reopened?.animalId);
  if (!reopened || !animal) return null;
  return {
    id: `push-${reopened.id}`,
    title: `Case reopened · ${animal.kennel} ${animal.name}`,
    body: `${reopened.finding}. Tap to open the case.`,
    at: now,
    target: { kind: 'case', caseId: reopened.id },
  };
}