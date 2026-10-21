import { DEFAULT_SESSION_IDLE_MINUTES, isMockAuthEnabled, parseAuthMode, parseIdleMinutes } from '@/config/env';

describe('env config', () => {
  it('defaults the idle timeout to 15 minutes (temporary) and parses valid values', () => {
    expect(DEFAULT_SESSION_IDLE_MINUTES).toBe(15);
    expect(parseIdleMinutes(undefined)).toBe(15);
    expect(parseIdleMinutes('abc')).toBe(15);
    expect(parseIdleMinutes('0')).toBe(15);
    expect(parseIdleMinutes('30')).toBe(30);
  });

  it('only treats "mock" as mock mode', () => {
    expect(parseAuthMode('mock')).toBe('mock');
    expect(parseAuthMode('oidc')).toBe('oidc');
    expect(parseAuthMode(undefined)).toBe('oidc');
  });

  describe('mock sign-in guard', () => {
    const original = (globalThis as { __DEV__?: boolean }).__DEV__;
    afterEach(() => {
      (globalThis as { __DEV__?: boolean }).__DEV__ = original;
    });

    it('is enabled only in development with mode=mock', () => {
      (globalThis as { __DEV__?: boolean }).__DEV__ = true;
      expect(isMockAuthEnabled('mock')).toBe(true);
      expect(isMockAuthEnabled('oidc')).toBe(false);
    });

    it('can never be enabled in a production build', () => {
      (globalThis as { __DEV__?: boolean }).__DEV__ = false;
      expect(isMockAuthEnabled('mock')).toBe(false);
    });
  });
});
