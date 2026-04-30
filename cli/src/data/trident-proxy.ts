import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AppConfig } from '../config.js';
import { DEFAULT_GATEWAY, DEFAULT_HTTPS } from '../auth/defaults.js';

export async function proxyTrident(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig
): Promise<void> {
  const auth = config.auth;

  if (!auth?.token) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        errors: [
          {
            message: 'Not authenticated. Run: npx @workday/everywhere auth login',
          },
        ],
      })
    );
    return;
  }

  const scheme = (auth.https ?? DEFAULT_HTTPS) ? 'https' : 'http';
  const gateway = auth.gateway ?? DEFAULT_GATEWAY;
  const targetUrl = `${scheme}://${gateway}/graphql/v5`;

  const body = await new Promise<string>((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
  });

  const upstream = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${auth.token}`,
      'content-type': 'application/json',
      'wd-graphql-developer-info': 'false',
      'x-api-gateway-originator': 'ROBOT',
    },
    body,
  });

  const responseBody = await upstream.text();
  res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
  res.end(responseBody);
}
