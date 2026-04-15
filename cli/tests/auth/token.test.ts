import { describe, it, expect } from 'vitest';
import { decodeToken, getTokenExpiryStatus } from '../../src/auth/token.js';

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fake-signature`;
}

describe('decodeToken', () => {
  it('returns the decoded payload from a valid JWT', () => {
    const token = makeJwt({ sub: 'user-123', exp: 9999999999 });
    const payload = decodeToken(token);
    expect(payload.sub).toBe('user-123');
  });

  it('throws on a string that is not a JWT', () => {
    expect(() => decodeToken('not-a-jwt')).toThrow('Invalid JWT format');
  });
});

describe('getTokenExpiryStatus', () => {
  describe('when the exp claim is in the future', () => {
    it("returns 'valid'", () => {
      const token = makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
      expect(getTokenExpiryStatus(token)).toBe('valid');
    });
  });

  describe('when the exp claim is in the past', () => {
    it("returns 'expired'", () => {
      const token = makeJwt({ exp: Math.floor(Date.now() / 1000) - 3600 });
      expect(getTokenExpiryStatus(token)).toBe('expired');
    });
  });

  describe('when the token has no exp claim', () => {
    it("returns 'unknown'", () => {
      const token = makeJwt({ sub: 'user-123' });
      expect(getTokenExpiryStatus(token)).toBe('unknown');
    });
  });
});
