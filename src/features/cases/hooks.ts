import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invalidateHealthRecords } from '@/api/invalidate';
import { queryKeys } from '@/api/queryKeys';
import { useActor } from '@/auth';

import {
  addFollowUp,
  addNote,
  assignCase,
  closeCase,
  getCase,
  listAssignableStaff,
  listCases,
  markReviewed,
  reopenCase,
  setFollowUpDone,
} from './casesApi';

export function useCaseList() {
  const actor = useActor();
  return useQuery({ queryKey: [...queryKeys.caseList, actor.id, actor.role], queryFn: () => listCases(actor) });
}

export function useCaseDetail(caseId: string) {
  const actor = useActor();
  return useQuery({ queryKey: queryKeys.caseDetail(caseId), queryFn: () => getCase(actor, caseId) });
}

export function useAssignableStaff() {
  const actor = useActor();
  return useQuery({ queryKey: [...queryKeys.staff, actor.id], queryFn: () => listAssignableStaff(actor) });
}

/** Wraps a case action so it receives the current user and refreshes every affected screen. */
function useCaseAction<T>(action: (input: T & { actor: ReturnType<typeof useActor> }) => Promise<void>) {
  const actor = useActor();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: T) => action({ ...input, actor }),
    onSuccess: () => invalidateHealthRecords(client),
  });
}

export const useAssignCase = () => useCaseAction<{ caseId: string; staffId: string }>(assignCase);
export const useAddFollowUp = () => useCaseAction<{ caseId: string; text: string; dueDate: string }>(addFollowUp);
export const useSetFollowUpDone = () => useCaseAction<{ caseId: string; followUpId: string; done: boolean }>(setFollowUpDone);
export const useAddNote = () => useCaseAction<{ caseId: string; text: string }>(addNote);
export const useMarkReviewed = () => useCaseAction<{ caseId: string }>(markReviewed);
export const useCloseCase = () => useCaseAction<{ caseId: string; reason: string; note: string }>(closeCase);
export const useReopenCase = () => useCaseAction<{ caseId: string }>(reopenCase);