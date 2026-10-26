import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { useActor } from '@/auth';
import type { TimelineEntry } from '@/domain/types';
import { listCountries } from '@/features/arrivals/arrivalApi';

import { getAnimalProfile, getRecordDetail, listAnimals, listRecentAnimalIds, markAnimalRecent } from './animalsApi';

export function useAnimalList() {
  const actor = useActor();
  return useQuery({ queryKey: [...queryKeys.animalList, actor.id, actor.role], queryFn: () => listAnimals(actor) });
}

export function useRecentAnimalIds() {
  return useQuery({ queryKey: queryKeys.recentAnimals, queryFn: listRecentAnimalIds });
}

export function useMarkAnimalRecent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: markAnimalRecent,
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.recentAnimals }),
  });
}

export function useAnimalProfile(animalId: string) {
  const actor = useActor();
  return useQuery({ queryKey: queryKeys.animalProfile(animalId), queryFn: () => getAnimalProfile(actor, animalId) });
}

/** Country name for an ISO code ("AU" → "Australia"); the code itself while the list loads. */
export function useCountryName(code: string): string {
  const countries = useQuery({ queryKey: queryKeys.countries, queryFn: listCountries, staleTime: 5 * 60_000 });
  return countries.data?.find((c) => c.code === code)?.name ?? code;
}

export function useRecordDetail(entry: Pick<TimelineEntry, 'id' | 'kind' | 'caseId'> | null) {
  return useQuery({
    queryKey: queryKeys.record(entry?.id ?? 'none'),
    queryFn: () => (entry ? getRecordDetail(entry) : Promise.resolve(null)),
    enabled: entry !== null,
  });
}