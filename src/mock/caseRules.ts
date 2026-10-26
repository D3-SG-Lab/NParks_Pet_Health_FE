/**
 * MOCK case rules engine (stand-in for BE-018). Applies a confirmed routing decision to the
 * in-memory store: timeline only, update an open case, create a case, or reopen a closed case.
 * Reopening keeps every earlier event, observation and piece of evidence linked to the case.
 */
import type { Actor, ClinicalSign, HealthCase, MediaItem, RoutingAction } from '@/domain/types';

import { mockDb, newMockId } from './db';

export class RoutingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoutingError';
  }
}

export interface RoutingDecision {
  action: RoutingAction;
  animalId: string;
  /** Required for update-case and reopen-case. */
  caseId: string | null;
  signs: readonly ClinicalSign[];
  /** Short text for the case event, e.g. the observation text. */
  detail: string;
  media: readonly MediaItem[];
  observationId?: string;
  actor: Actor;
  now?: number;
}

/** Returns the case that was updated, created or reopened (null for timeline only). */
export function applyRouting(decision: RoutingDecision): HealthCase | null {
  const now = decision.now ?? Date.now();
  const by = decision.actor.name;
  if (decision.action === 'timeline-only') return null;

  if (decision.action === 'new-case') {
    const main = decision.signs[0];
    const healthCase: HealthCase = {
      id: `C-${new Date(now).getFullYear()}-${String(mockDb.nextId).padStart(4, '0')}`,
      animalId: decision.animalId,
      // "GI upset — vomiting, reduced appetite"
      finding: main
        ? `${main.system === 'General' ? 'Unwell' : `${main.system} upset`} — ${decision.signs.map((s) => s.label.toLowerCase()).join(', ')}`
        : 'Health concern',
      system: main?.system ?? 'General',
      status: 'open',
      openedAt: now,
      updatedAt: now,
      assigneeId: null,
      followUps: [],
      events: [
        {
          id: newMockId('ev'),
          at: now,
          kind: 'opened',
          title: 'Case opened from AI routing',
          by,
          detail: `Confirmed by ${by}`,
          observationId: decision.observationId,
        },
      ],
      evidence: [...decision.media],
      closedAt: null,
      closeReason: null,
      reopenedAt: null,
    };
    mockDb.nextId += 1;
    mockDb.cases.push(healthCase);
    return healthCase;
  }

  const healthCase = mockDb.cases.find((c) => c.id === decision.caseId && c.animalId === decision.animalId);
  if (!healthCase) throw new RoutingError('That case does not belong to this animal.');

  if (decision.action === 'update-case') {
    if (healthCase.status === 'closed') throw new RoutingError('This case is closed. Reopen it instead.');
    healthCase.events.push({
      id: newMockId('ev'),
      at: now,
      kind: 'observation',
      title: 'Observation routed by AI · update case',
      by,
      detail: decision.detail,
      observationId: decision.observationId,
    });
  } else {
    if (healthCase.status !== 'closed') throw new RoutingError('This case is already open.');
    healthCase.status = 'open';
    healthCase.reopenedAt = now;
    healthCase.closedAt = null;
    healthCase.closeReason = null;
    healthCase.events.push({
      id: newMockId('ev'),
      at: now,
      kind: 'reopened',
      title: 'Case reopened · related signs',
      by,
      detail: decision.detail,
      observationId: decision.observationId,
    });
  }
  healthCase.evidence.push(...decision.media);
  healthCase.updatedAt = now;
  return healthCase;
}