import type { IncomingHttpHeaders } from 'node:http';

/**
 * Returns the stored token to inject as a Bearer Authorization header, or null if the
 * incoming request already carries its own auth (Authorization header or session cookie).
 */
export function resolveProxyAuth(
  headers: IncomingHttpHeaders,
  storedToken: string | undefined
): string | null {
  if (headers['authorization']) return null;
  if (headers['cookie']) return null;
  return storedToken ?? null;
}
