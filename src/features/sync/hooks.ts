import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { invalidateHealthRecords } from '@/api/invalidate';
import { queryKeys } from '@/api/queryKeys';
import type { SyncState } from '@/domain/types';

import { getSyncState, retrySyncItem, setWorkOffline, syncNow } from './syncApi';

/** Polls quickly while records are uploading; refreshes every other screen as items finish. */
export function useSyncState() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.sync,
    queryFn: getSyncState,
    refetchInterval: (q) => (q.state.data?.syncing ? 250 : false),
  });
  const pending = query.data?.items.length ?? 0;
  const previous = useRef(pending);
  useEffect(() => {
    // Something reached the server (e.g. an observation now goes to the AI): refresh the data.
    if (pending < previous.current) void invalidateHealthRecords(client);
    previous.current = pending;
  }, [pending, client]);
  return query;
}

function useSyncMutation<T>(fn: (input: T) => Promise<SyncState>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (state) => client.setQueryData(queryKeys.sync, state),
  });
}

export const useSetWorkOffline = () => useSyncMutation(setWorkOffline);
export const useSyncNow = () => useSyncMutation<void>(() => syncNow());
export const useRetrySyncItem = () => useSyncMutation(retrySyncItem);