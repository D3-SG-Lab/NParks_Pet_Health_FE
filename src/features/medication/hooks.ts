import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invalidateHealthRecords } from '@/api/invalidate';
import { queryKeys } from '@/api/queryKeys';
import { useActor } from '@/auth';
import { todayIso } from '@/utils/dates';

import { getMedicationDay, listMedicationAnimals, recordAdministration, type RecordDoseInput } from './medicationApi';

/** Due status changes with the clock, so these lists refresh every minute while shown. */
const CLOCK_REFRESH_MS = 60_000;

export function useMedicationAnimals() {
  const actor = useActor();
  return useQuery({
    queryKey: [...queryKeys.medicationAnimals(todayIso()), actor.id, actor.role],
    queryFn: () => listMedicationAnimals(actor),
    refetchInterval: CLOCK_REFRESH_MS,
  });
}

export function useMedicationDay(animalId: string | null) {
  const actor = useActor();
  return useQuery({
    queryKey: [...queryKeys.medicationDay(animalId ?? 'none', todayIso()), actor.id],
    queryFn: () => (animalId ? getMedicationDay(actor, animalId) : Promise.resolve(null)),
    enabled: animalId !== null,
    refetchInterval: CLOCK_REFRESH_MS,
  });
}

export function useRecordAdministration() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordDoseInput) => recordAdministration(input),
    onSuccess: () => invalidateHealthRecords(client),
  });
}