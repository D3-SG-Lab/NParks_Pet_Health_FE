/** Central TanStack Query keys, so mutations can invalidate exactly the queries they affect. */
export const queryKeys = {
  operations: ['operations'] as const,
  operationsSummary: ['operations', 'summary'] as const,
  animals: ['animals'] as const,
  kennels: ['kennels'] as const,
  vets: ['vets'] as const,
  countries: ['countries'] as const,
  arrivalDraft: ['arrival', 'draft'] as const,
};
