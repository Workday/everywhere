import { describe, it, expect } from 'vitest';
import { decodeToken, isTokenExpired } from '../../src/auth/token.js';

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

describe('isTokenExpired', () => {
  it('returns false when the token expiry is in the future', () => {
    const token = makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(isTokenExpired(token)).toBe(false);
  });

  it('returns true when the token expiry is in the past', () => {
    const token = makeJwt({ exp: Math.floor(Date.now() / 1000) - 3600 });
    expect(isTokenExpired(token)).toBe(true);
  });

  it('returns true when the token has no exp claim', () => {
    const token = makeJwt({ sub: 'user-123' });
    expect(isTokenExpired(token)).toBe(true);
  });
});
