import { describe, it, expect } from 'vitest';
import { isUnauthenticated } from '../../src/data/proxy-auth.js';

describe('isUnauthenticated', () => {
  describe('when the request has an Authorization header', () => {
    it('returns false', () => {
      expect(isUnauthenticated({ authorization: 'Bearer existing-token' })).toBe(false);
    });
  });

  describe('when the request has a we_session cookie', () => {
    it('returns false', () => {
      expect(isUnauthenticated({ cookie: 'we_session=abc123' })).toBe(false);
    });

    it('returns false when we_session is among other cookies', () => {
      expect(isUnauthenticated({ cookie: 'analytics=x; we_session=abc123; theme=dark' })).toBe(
        false
      );
    });
  });

  describe('when the request has cookies but no we_session', () => {
    it('returns true', () => {
      expect(isUnauthenticated({ cookie: 'analytics=x; theme=dark' })).toBe(true);
    });
  });

  describe('when the request has no auth headers', () => {
    it('returns true', () => {
      expect(isUnauthenticated({})).toBe(true);
    });
  });

  describe('when both Authorization and we_session cookie are present', () => {
    it('returns false', () => {
      expect(
        isUnauthenticated({ authorization: 'Bearer token', cookie: 'we_session=abc123' })
      ).toBe(false);
    });
  });
});
