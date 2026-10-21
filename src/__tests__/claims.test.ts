import { buildSession, decodeJwtPayload, extractRole } from '@/auth/claims';
import type { StoredSession } from '@/auth/types';

function jwt(payload: object): string {
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${enc({ alg: 'none' })}.${enc(payload)}.`;
}

function stored(payload: object, provider: 'officer' | 'contractor' = 'officer'): StoredSession {
  return { accessToken: jwt({}), idToken: jwt(payload), provider, mock: false, expiresAt: Date.now() + 1000 };
}

describe('claims', () => {
  it('decodes a JWT payload and rejects garbage', () => {
    expect(decodeJwtPayload(jwt({ sub: 'a' }))).toEqual({ sub: 'a' });
    expect(decodeJwtPayload('not-a-token')).toBeNull();
    expect(decodeJwtPayload(undefined)).toBeNull();
  });

  it('extracts the role from string and array claims', () => {
    expect(extractRole({ role: 'Officer' }, 'role')).toBe('officer');
    expect(extractRole({ groups: ['x', 'contractor'] }, 'groups')).toBe('contractor');
    expect(extractRole({ role: 'admin' }, 'role')).toBeNull();
    expect(extractRole({}, 'role')).toBeNull();
  });

  it('prefers the lower-privilege role when both are present', () => {
    expect(extractRole({ role: ['officer', 'contractor'] }, 'role')).toBe('contractor');
  });

  it('builds a session from claims, or null without a role', () => {
    const s = buildSession(stored({ role: 'officer', sub: 'u1', name: 'Sam' }), 'role');
    expect(s).toMatchObject({ role: 'officer', userId: 'u1', name: 'Sam' });
    expect(buildSession(stored({ sub: 'u1' }), 'role')).toBeNull();
  });
});
