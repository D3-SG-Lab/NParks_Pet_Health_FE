/**
 * Operations dashboard data access.
 *
 * MOCK: derived from the in-memory demo store. OUTSTANDING endpoint (BE-021): today's monitoring
 * counts, the review count and alerts. Counts are derived from the same records the other screens
 * use, so changes show up everywhere.
 */
import { OVERDUE_AFTER_MS, SESSION_DUE_TIME } from '@/domain/describe';
import type { Actor, OperationsAlert, OperationsSummary } from '@/domain/types';
import { mockDb } from '@/mock/db';
import { overTheWire, simulateLatency } from '@/mock/latency';
import { resolvePendingAnalyses } from '@/mock/processing';
import { animalsInScope } from '@/mock/scope';
import { isoDateOf, msAt, sessionFor } from '@/utils/dates';

export async function getOperationsSummary(actor: Actor, now: number = Date.now()): Promise<OperationsSummary> {
  await simulateLatency();
  resolvePendingAnalyses(now);
  const session = sessionFor(new Date(now));
  const animals = animalsInScope(actor);
  const visible = new Map(animals.map((animal) => [animal.id, animal]));
  const due = (animal: (typeof animals)[number]) =>
    session === 'AM' ? animal.today.amInspection === 'due' : animal.today.pmInspection === 'due';

  // A session check becomes an "overdue" alert two hours after it was due.
  const overdueSince = msAt(isoDateOf(now), SESSION_DUE_TIME[session]) + OVERDUE_AFTER_MS;
  const overdue: OperationsAlert[] =
    now >= overdueSince
      ? animals.filter(due).map((animal) => ({
          id: `overdue-${animal.id}-${session}`,
          animalId: animal.id,
          caseId: null,
          kind: 'overdue',
          message: `${session} inspection overdue`,
          meta: `Due ${SESSION_DUE_TIME[session]}`,
          at: overdueSince,
        }))
      : [];

  const alerts = [...mockDb.alerts, ...overdue].flatMap((alert) => {
    const animal = visible.get(alert.animalId);
    if (!animal) return [];
    // Alerts for closed cases, or review alerts whose review is done, no longer need attention.
    if (alert.caseId) {
      const healthCase = mockDb.cases.find((c) => c.id === alert.caseId);
      if (!healthCase || healthCase.status === 'closed' || (alert.kind === 'review' && healthCase.status !== 'review')) return [];
    }
    return [{ ...alert, animalName: animal.name, kennel: animal.kennel }];
  });

  return overTheWire({
    activePets: animals.length,
    checksDue: animals.filter(due).length,
    session,
    openCases: mockDb.cases.filter((c) => c.status !== 'closed' && visible.has(c.animalId)).length,
    observationsNeedingReview: mockDb.observations.filter((o) => o.status === 'review').length,
    alerts: alerts.sort((a, b) => b.at - a.at),
    updatedAt: now,
  });
}