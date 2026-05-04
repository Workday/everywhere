import type { IncomingHttpHeaders } from 'node:http';

function hasSessionCookie(cookieHeader: string): boolean {
  return cookieHeader.split(';').some((part) => part.trim().startsWith('we_session='));
}

/**
 * Returns true if the request carries no recognised auth — no Authorization header and no
 * we_session cookie — indicating the proxy should inject the stored bearer token.
 */
export function isUnauthenticated(headers: IncomingHttpHeaders): boolean {
  if (headers['authorization']) return false;
  const cookie = headers['cookie'];
  if (typeof cookie === 'string' && hasSessionCookie(cookie)) return false;
  return true;
}
