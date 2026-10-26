import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

/**
 * Health records feed several screens at once (Operations counts, the animal timeline and summary,
 * cases, the review queue, inspections and medication). After any record changes, refresh them all
 * so every screen shows the same data when the user returns to it.
 */
export function invalidateHealthRecords(client: QueryClient): Promise<void> {
  return Promise.all(
    [queryKeys.operations, queryKeys.animals, queryKeys.inspections, queryKeys.observations, queryKeys.cases, queryKeys.medication, queryKeys.sync].map(
      (queryKey) => client.invalidateQueries({ queryKey }),
    ),
  ).then(() => undefined);
}