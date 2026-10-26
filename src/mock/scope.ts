/**
 * MOCK data scoping (stand-in for BE-005): contractors only see animals in the kennels assigned to
 * them. The real API must enforce this; the app only mirrors it.
 */
import type { Actor, Animal } from '@/domain/types';

import { mockContractorKennels, mockDb } from './db';

export function canSeeAnimal(actor: Actor, animal: Pick<Animal, 'kennel'>): boolean {
  return actor.role !== 'contractor' || mockContractorKennels.includes(animal.kennel);
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