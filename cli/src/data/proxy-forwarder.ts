import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Composes the canonical upstream Workday path from the portion of a request URL
 * that follows the `/api/v1/tenant` mount prefix.
 *
 * Input    /<service>/<version>[/<rest>][?<query>]
 * Output   /ccx/api/<service>/<version>/<tenant>[/<rest>][?<query>]
 *
 * Returns null if the input has fewer than two leading segments
 * (i.e. doesn't carry both a service and a version).
 */
export function composeUpstreamPath(strippedPath: string, tenant: string): string | null {
  const queryIndex = strippedPath.indexOf('?');
  const pathPart = queryIndex === -1 ? strippedPath : strippedPath.slice(0, queryIndex);
  const queryPart = queryIndex === -1 ? '' : strippedPath.slice(queryIndex);
  const rest = pathPart.startsWith('/') ? pathPart.slice(1) : pathPart;
  const segments = rest.split('/');
  if (segments.length < 2) return null;
  const [service, version, ...remainder] = segments;
  if (!service || !version) return null;
  const tail = remainder.length > 0 ? `/${remainder.join('/')}` : '';
  return `/ccx/api/${service}/${version}/${tenant}${tail}${queryPart}`;
}

export interface ForwarderConfig {
  gateway: string;
  tenant: string;
  getToken: () => Promise<string | null>;
}

export function createTenantForwarder(config: ForwarderConfig) {
  return async function forward(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const incomingPath = req.url ?? '/';
    const rewritten = composeUpstreamPath(incomingPath, config.tenant);
    if (!rewritten) {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: `unrecognised tenant path: ${incomingPath}` }));
      return;
    }

    const token = await config.getToken();
    if (!token) {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'no stored auth token — run: npx @workday/everywhere auth login',
        })
      );
      return;
    }

    let body: Buffer;
    try {
      body = await readBody(req);
    } catch (err) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: `failed to read request body: ${(err as Error).message}` }));
      return;
    }
    const upstreamUrl = `${config.gateway}${rewritten}`;

    const headers: Record<string, string> = {
      authorization: `Bearer ${token}`,
      accept:
        typeof req.headers['accept'] === 'string' ? req.headers['accept'] : 'application/json',
    };
    const contentType = req.headers['content-type'];
    if (typeof contentType === 'string') headers['content-type'] = contentType;

    let upstream: Response;
    try {
      upstream = await fetch(upstreamUrl, {
        method: req.method ?? 'GET',
        headers,
        body: body.length > 0 ? new Uint8Array(body) : undefined,
      });
    } catch (err) {
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: `upstream fetch failed: ${(err as Error).message}` }));
      return;
    }

    const responseBody = await upstream.text();
    const responseContentType = upstream.headers.get('content-type') ?? 'application/json';
    res.writeHead(upstream.status, { 'content-type': responseContentType });
    res.end(responseBody);
  };
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
