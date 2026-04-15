export interface TokenPayload {
  sub?: string;
  exp?: number;
  [key: string]: unknown;
}

export function decodeToken(jwt: string): TokenPayload {
  const parts = jwt.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  const payloadPart = parts[1];
  if (!payloadPart) {
    throw new Error('Invalid JWT format');
  }
  const payload = Buffer.from(payloadPart, 'base64url').toString('utf-8');
  return JSON.parse(payload) as TokenPayload;
}

export type TokenExpiryStatus = 'valid' | 'expired' | 'unknown';

export function getTokenExpiryStatus(jwt: string): TokenExpiryStatus {
  const payload = decodeToken(jwt);
  if (payload.exp === undefined) {
    return 'unknown';
  }
  return payload.exp < Math.floor(Date.now() / 1000) ? 'expired' : 'valid';
}
