import type { IncomingMessage, ServerResponse } from 'node:http';

const PROXY_PREFIX = '/api/v1/proxy/';

/**
 * Transforms a plugin-facing proxy path into the canonical upstream Workday path.
 *
 * Plugin calls    /api/v1/proxy/<service>/<version>[/<rest>]
 * Forwarded to    /ccx/api/<service>/<version>/<tenant>[/<rest>]
 *
 * Returns null for paths that don't match the proxy prefix or are too short to
 * carry a service + version pair.
 */
export function rewriteProxyPath(path: string, tenant: string): string | null {
  if (!path.startsWith(PROXY_PREFIX)) return null;
  const rest = path.slice(PROXY_PREFIX.length);
  const segments = rest.split('/');
  if (segments.length < 2) return null;
  const [service, version, ...remainder] = segments;
  const tail = remainder.length > 0 ? `/${remainder.join('/')}` : '';
  return `/ccx/api/${service}/${version}/${tenant}${tail}`;
}

export interface ForwarderConfig {
  gateway: string;
  tenant: string;
  getToken: () => Promise<string | null>;
}

export function createProxyForwarder(config: ForwarderConfig) {
  return async function forward(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const incomingPath = req.url ?? '/';
    const rewritten = rewriteProxyPath(incomingPath, config.tenant);
    if (!rewritten) {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: `unrecognised proxy path: ${incomingPath}` }));
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

    const body = await readBody(req);
    const upstreamUrl = `${config.gateway}${rewritten}`;

    const headers: Record<string, string> = {
      authorization: `Bearer ${token}`,
      accept: typeof req.headers['accept'] === 'string' ? req.headers['accept'] : 'application/json',
    };
    const contentType = req.headers['content-type'];
    if (typeof contentType === 'string') headers['content-type'] = contentType;

    let upstream: Response;
    try {
      upstream = await fetch(upstreamUrl, {
        method: req.method ?? 'GET',
        headers,
        body: body.length > 0 ? body : undefined,
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
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
