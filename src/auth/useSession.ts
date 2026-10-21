import { useContext } from 'react';

import { SessionContext, type SessionContextValue } from './AuthProvider';

/** Session state, role and auth actions. Use `role` / `isOfficer` / `isContractor` for role-based visibility. */
export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <AuthProvider>.');
  return value;
}
