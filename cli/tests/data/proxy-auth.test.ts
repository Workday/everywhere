import { describe, it, expect } from 'vitest';
import { resolveProxyAuth } from '../../src/data/proxy-auth.js';

describe('resolveProxyAuth', () => {
  describe('when the incoming request has an Authorization header', () => {
    it('does not inject a token', () => {
      const result = resolveProxyAuth({ authorization: 'Bearer existing-token' }, 'stored-token');

      expect(result).toBeNull();
    });
  });

  describe('when the incoming request has a Cookie header', () => {
    it('does not inject a token', () => {
      const result = resolveProxyAuth({ cookie: 'session=abc123' }, 'stored-token');

      expect(result).toBeNull();
    });
  });

  describe('when the incoming request has no auth headers', () => {
    it('returns the stored token when one is configured', () => {
      const result = resolveProxyAuth({}, 'stored-token');

      expect(result).toBe('stored-token');
    });

    it('returns null when no stored token is configured', () => {
      const result = resolveProxyAuth({}, undefined);

      expect(result).toBeNull();
    });
  });
});
