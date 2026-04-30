import * as path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleGraphQL } from './graphql-handler.js';
import { proxyTrident } from './trident-proxy.js';
import { appConfig } from '../config.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VitePlugin = any;

export function dataServicePlugin(pluginDir: string): VitePlugin {
  const dataDir = path.join(pluginDir, '.data');

  return {
    name: 'workday-everywhere-data',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    configureServer(server: { middlewares: { use: (...args: any[]) => void } }) {
      server.middlewares.use(
        '/api/data/graphql',
        async (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          const body = await new Promise<string>((resolve) => {
            const chunks: Buffer[] = [];
            req.on('data', (chunk: Buffer) => chunks.push(chunk));
            req.on('end', () => resolve(Buffer.concat(chunks).toString()));
          });

          const request = JSON.parse(body) as {
            query: string;
            variables: Record<string, unknown>;
          };
          const result = await handleGraphQL(dataDir, request);

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(JSON.stringify(result));
        }
      );

      server.middlewares.use('/_we/trident', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        await proxyTrident(req, res, appConfig().read());
      });
    },
  };
}
