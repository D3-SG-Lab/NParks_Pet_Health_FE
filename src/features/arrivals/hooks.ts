import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import type { ArrivalDraft } from '@/domain/types';

import {
  completeArrival,
  getArrivalDraft,
  listCountries,
  listKennelOptions,
  listVets,
  saveArrivalDraft,
  type ArrivalDraftPatch,
} from './arrivalApi';

export function useKennelOptions() {
  return useQuery({ queryKey: queryKeys.kennels, queryFn: listKennelOptions, staleTime: 60_000 });
}

export function useVets() {
  return useQuery({ queryKey: queryKeys.vets, queryFn: listVets, staleTime: 5 * 60_000 });
}

export function useCountries() {
  return useQuery({ queryKey: queryKeys.countries, queryFn: listCountries, staleTime: 5 * 60_000 });
}

export function useArrivalDraft() {
  return useQuery({
    queryKey: queryKeys.arrivalDraft,
    queryFn: getArrivalDraft,
    // The draft is only changed through the mutations below, which keep this cache current.
    staleTime: Infinity,
  });
}

export function useSaveArrivalDraft() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: ArrivalDraftPatch) => saveArrivalDraft(patch),
    onSuccess: (draft: ArrivalDraft) => client.setQueryData(queryKeys.arrivalDraft, draft),
  });
}

/** Completes the arrival: the new animal must show up on Operations counts and in animal lists. */
export function useCompleteArrival() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: completeArrival,
    // The cached draft is cleared by the exam screen as it closes (see ArrivalExamScreen), so the
    // screen does not flash its "no arrival" state while the success navigation is animating.
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.operations }),
        client.invalidateQueries({ queryKey: queryKeys.animals }),
        client.invalidateQueries({ queryKey: queryKeys.kennels }),
      ]);
    },
  });
}
