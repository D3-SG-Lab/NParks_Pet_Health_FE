/**
 * MOCK AI worker (stand-in for AI-006). An observation is saved first ("processing"); its AI result
 * becomes available once `readyAt` has passed. Resolved lazily whenever observations are read, so
 * there are no background timers and tests stay deterministic.
 */
import { analyseObservation, needsReview } from './ai';
import { mockDb, mockSigns } from './db';
import { canSeeAnimal } from './scope';

export function resolvePendingAnalyses(now: number = Date.now()): void {
  for (const observation of mockDb.observations) {
    if (observation.status !== 'processing' || observation.readyAt === null || now < observation.readyAt) continue;
    const actor = { id: '', name: observation.submittedBy, role: observation.submittedByRole };
    const ai = analyseObservation({
      text: observation.text,
      chosenAnimalId: observation.animalId,
      animals: mockDb.animals.filter((animal) => canSeeAnimal(actor, animal)),
      cases: mockDb.cases,
      taxonomy: mockSigns,
      now: observation.readyAt,
      durationSec: Math.max(1, Math.round((observation.readyAt - observation.submittedAt) / 1000)),
    });
    observation.ai = ai;
    observation.status = needsReview(ai) ? 'review' : 'awaiting-confirmation';
  }
}