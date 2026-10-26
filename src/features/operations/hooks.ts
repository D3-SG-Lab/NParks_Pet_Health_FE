import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { useActor } from '@/auth';

import { getOperationsSummary } from './operationsApi';

export function useOperationsSummary() {
  const actor = useActor();
  return useQuery({ queryKey: [...queryKeys.operationsSummary, actor.id, actor.role], queryFn: () => getOperationsSummary(actor) });
}
