import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';

import { getOperationsSummary } from './operationsApi';

export function useOperationsSummary() {
  return useQuery({ queryKey: queryKeys.operationsSummary, queryFn: getOperationsSummary });
}
