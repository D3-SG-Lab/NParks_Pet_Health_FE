import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invalidateHealthRecords } from '@/api/invalidate';
import { queryKeys } from '@/api/queryKeys';

import {
  confirmRouting,
  getObservation,
  listCasesForAnimal,
  listReviewQueue,
  listSigns,
  sendToReviewQueue,
  submitObservation,
  type ConfirmRoutingInput,
  type SubmitObservationInput,
} from './observationApi';

export function useSigns() {
  return useQuery({ queryKey: queryKeys.signs, queryFn: listSigns, staleTime: Infinity });
}

/** Polls while the AI is still processing the observation. */
export function useObservation(id: string) {
  return useQuery({
    queryKey: queryKeys.observation(id),
    queryFn: () => getObservation(id),
    refetchInterval: (q) => (q.state.data?.observation.status === 'processing' ? 1000 : false),
  });
}

export function useCasesForAnimal(animalId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.cases, 'for-animal', animalId ?? 'none'],
    queryFn: () => (animalId ? listCasesForAnimal(animalId) : Promise.resolve([])),
    enabled: animalId !== null,
  });
}

export function useReviewQueue() {
  return useQuery({ queryKey: queryKeys.reviewQueue, queryFn: listReviewQueue });
}

export function useSubmitObservation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitObservationInput) => submitObservation(input),
    onSuccess: () => invalidateHealthRecords(client),
  });
}

export function useConfirmRouting() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ConfirmRoutingInput) => confirmRouting(input),
    onSuccess: () => invalidateHealthRecords(client),
  });
}

export function useSendToReviewQueue() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: sendToReviewQueue,
    onSuccess: () => invalidateHealthRecords(client),
  });
}