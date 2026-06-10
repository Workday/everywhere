import type { IncomingMessage, ServerResponse } from 'node:http';

export interface ForwarderConfig {
  gateway: string;
  getToken: () => Promise<string | null>;
}

export function createTenantForwarder(config: ForwarderConfig) {
  return async function forward(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const incomingPath = req.url ?? '';
    if (!incomingPath || incomingPath === '/') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: `no path to forward: ${incomingPath}` }));
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
    const upstreamUrl = `${config.gateway}${incomingPath}`;

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
