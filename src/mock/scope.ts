/**
 * MOCK data scoping (stand-in for BE-005): contractors only see animals in the kennels assigned to
 * them. The real API must enforce this; the app only mirrors it. Animals from the backend are already
 * scoped by GET /animals, so the filter applies to the demo animals only.
 */
import type { Actor, Animal } from '@/domain/types';

import { mockContractorKennels, mockDb } from './db';

/** Backend ids (stays, inspections, observations, schedules) are numeric; demo records use "animal-N", "obs-N", …. */
export function isBackendId(id: string): boolean {
  return /^\d+$/.test(id);
}

export function canSeeAnimal(actor: Actor, animal: Pick<Animal, 'id' | 'kennel'>): boolean {
  return actor.role !== 'contractor' || isBackendId(animal.id) || mockContractorKennels.includes(animal.kennel);
}

export function animalsInScope(actor: Actor): Animal[] {
  return mockDb.animals.filter((animal) => animal.status === 'active-monitoring' && canSeeAnimal(actor, animal));
}

export class ScopeError extends Error {
  constructor() {
    super('This animal is outside your assigned kennels.');
    this.name = 'ScopeError';
  }
}