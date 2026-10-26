import { useMemo } from 'react';

import type { Actor } from '@/domain/types';

import { useSession } from './useSession';

/** The signed-in user as the author of records. Time and user are captured automatically, never typed. */
export function useActor(): Actor {
  const { session, role } = useSession();
  return useMemo(
    () => ({
      id: session?.userId ?? 'unknown-user',
      name: session?.name?.trim() || (role === 'contractor' ? 'Contractor' : 'Officer'),
      role: role ?? 'officer',
    }),
    [session?.userId, session?.name, role],
  );
}