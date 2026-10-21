/**
 * Operations dashboard data access.
 *
 * MOCK: derived from the in-memory demo store. OUTSTANDING endpoint: an operations summary
 * (active pets, AM checks due, open cases, observations needing review, alerts) from the backend.
 * Counts are derived from the same records the other screens use, so changes show up everywhere.
 */
import type { OperationsSummary } from '@/domain/types';
import { mockDb } from '@/mock/db';
import { simulateLatency } from '@/mock/latency';

export async function getOperationsSummary(): Promise<OperationsSummary> {
  await simulateLatency();
  const animals = new Map(mockDb.animals.map((animal) => [animal.id, animal]));
  return {
    activePets: mockDb.animals.filter((animal) => animal.status === 'active-monitoring').length,
    checksDueAm: mockDb.animals.filter((animal) => animal.today.amInspection === 'due').length,
    openCases: mockDb.cases.filter((c) => c.status !== 'closed').length,
    observationsNeedingReview: mockDb.reviewQueueCount,
    alerts: mockDb.alerts.flatMap((alert) => {
      const animal = animals.get(alert.animalId);
      return animal ? [{ ...alert, animalName: animal.name, kennel: animal.kennel }] : [];
    }),
  };
}
