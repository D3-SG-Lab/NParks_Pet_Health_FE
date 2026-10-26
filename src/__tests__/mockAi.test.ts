import type { HealthCase } from '@/domain/types';
import { analyseObservation, extractSigns, matchAnimal, needsReview, suggestRouting } from '@/mock/ai';
import { SEED_ANIMALS, SEED_SIGNS } from '@/mock/seed';

const NOW = new Date(2026, 9, 22, 12, 0).getTime();
const DAY = 24 * 60 * 60_000;

function healthCase(overrides: Partial<HealthCase>): HealthCase {
  return {
    id: 'C-1',
    animalId: 'animal-2',
    finding: 'GI signs',
    system: 'GI',
    status: 'open',
    openedAt: NOW - 3 * DAY,
    updatedAt: NOW - DAY,
    assigneeId: null,
    followUps: [],
    events: [],
    evidence: [],
    closedAt: null,
    closeReason: null,
    reopenedAt: null,
    ...overrides,
  };
}

describe('mock AI (AI-002 to AI-004)', () => {
  it('AI-002: matches on kennel code and name with high confidence', () => {
    expect(matchAnimal('KC2-2 Yang Yang soft stool', SEED_ANIMALS)).toMatchObject({ animalId: 'animal-2', confidence: 0.96 });
    expect(matchAnimal('kc2-4 left half of breakfast', SEED_ANIMALS)).toMatchObject({ animalId: 'animal-4', confidence: 0.9 });
  });

  it('AI-002: unsure or missing names are low confidence or no match', () => {
    expect(matchAnimal('Pepper? coughing', SEED_ANIMALS)?.confidence).toBeLessThan(0.75);
    expect(matchAnimal('the dog in the end kennel', SEED_ANIMALS)).toBeNull();
  });

  it('AI-003: extracts signs, food and stool values', () => {
    const result = extractSigns('Soft stool this morning, left half of breakfast', SEED_SIGNS, NOW);
    expect(result.signs.map((s) => s.code)).toEqual(expect.arrayContaining(['soft-stool', 'reduced-appetite']));
    expect(result.stool).toBe('Soft');
    expect(result.food).toBe('Half');
  });

  it('AI-004: suggests updating an open case with the same body system', () => {
    const signs = SEED_SIGNS.filter((s) => s.code === 'vomiting');
    expect(suggestRouting(signs, 'animal-2', [healthCase({})], NOW)).toMatchObject({ action: 'update-case', caseId: 'C-1' });
  });

  it('AI-004: suggests reopening a recently closed case, else a new case', () => {
    const signs = SEED_SIGNS.filter((s) => s.code === 'sneezing');
    const closed = healthCase({ id: 'C-2', system: 'Respiratory', status: 'closed', closedAt: NOW - 5 * DAY });
    expect(suggestRouting(signs, 'animal-2', [closed], NOW)).toMatchObject({ action: 'reopen-case', caseId: 'C-2' });
    const old = { ...closed, closedAt: NOW - 60 * DAY };
    expect(suggestRouting(signs, 'animal-2', [old], NOW)).toMatchObject({ action: 'new-case', caseId: null });
    expect(suggestRouting([], 'animal-2', [], NOW).action).toBe('timeline-only');
  });

  it('FE-012: a user-picked animal never needs review; an unmatched one does', () => {
    const picked = analyseObservation({ text: 'eating well', chosenAnimalId: 'animal-1', animals: SEED_ANIMALS, cases: [], taxonomy: SEED_SIGNS, now: NOW });
    expect(picked.match).toMatchObject({ animalId: 'animal-1', selectedByUser: true });
    expect(needsReview(picked)).toBe(false);
    const unmatched = analyseObservation({ text: 'something coughing', chosenAnimalId: null, animals: SEED_ANIMALS, cases: [], taxonomy: SEED_SIGNS, now: NOW });
    expect(needsReview(unmatched)).toBe(true);
  });
});