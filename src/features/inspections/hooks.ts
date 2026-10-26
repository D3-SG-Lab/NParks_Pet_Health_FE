import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invalidateHealthRecords } from '@/api/invalidate';
import { queryKeys } from '@/api/queryKeys';
import { useActor } from '@/auth';
import type { InspectionSession } from '@/domain/types';
import { todayIso } from '@/utils/dates';

import { getInspectionBoard, submitInspection, type SubmitInspectionInput } from './inspectionApi';

export function useInspectionBoard(session: InspectionSession) {
  const actor = useActor();
  return useQuery({
    queryKey: [...queryKeys.inspectionBoard(todayIso(), session), actor.id, actor.role],
    queryFn: () => getInspectionBoard(actor, session),
  });
}

export function useSubmitInspection() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitInspectionInput) => submitInspection(input),
    onSuccess: () => invalidateHealthRecords(client),
  });
}