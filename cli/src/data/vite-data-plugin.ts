import type { IncomingMessage, ServerResponse } from 'node:http';
import { appConfig } from '../config.js';
import { DEFAULT_GATEWAY } from '../auth/defaults.js';
import { GatewayClient, GatewayRequestError } from '../gateway/client.js';
import { createTenantForwarder } from './proxy-forwarder.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VitePlugin = any;

interface ResolvedAuth {
  gateway: string;
  tenant: string;
  token: string;
}

async function resolveAuth(): Promise<ResolvedAuth | null> {
  const saved = appConfig().read();
  const token = saved.auth?.token;
  if (!token) return null;
  const gateway = saved.auth?.gateway ?? DEFAULT_GATEWAY;
  const client = new GatewayClient({ gateway, token });
  const body = await client.getJson<{ tenant?: unknown }>('/api/v1/me');
  if (typeof body.tenant !== 'string' || body.tenant.length === 0) {
    throw new Error('gateway /api/v1/me response missing tenant');
  }
  return { gateway, tenant: body.tenant, token };
}

export function dataServicePlugin(_pluginDir: string): VitePlugin {
  let cached: Promise<ResolvedAuth | null> | undefined;
  const getResolved = (): Promise<ResolvedAuth | null> => {
    if (!cached) cached = resolveAuth();
    return cached;
  };

  return {
    name: 'workday-everywhere-data',
    configureServer(server: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      middlewares: { use: (...args: any[]) => void };
    }) {
      server.middlewares.use(
        '/api/v1/tenant',
        async (req: IncomingMessage, res: ServerResponse) => {
          let resolved: ResolvedAuth | null;
          try {
            resolved = await getResolved();
          } catch (err) {
            // Reset cache so a subsequent request can retry after the user re-authenticates.
            cached = undefined;
            const status = err instanceof GatewayRequestError ? err.status : undefined;
            if (status === 401 || status === 403) {
              res.writeHead(401, { 'content-type': 'application/json' });
              res.end(
                JSON.stringify({
                  error: 'auth token rejected — run: npx @workday/everywhere auth login',
                })
              );
              return;
            }
            res.writeHead(500, { 'content-type': 'application/json' });
            res.end(
              JSON.stringify({
                error: `failed to resolve auth state: ${(err as Error).message}`,
              })
            );
            return;
          }

          if (!resolved) {
            res.writeHead(401, { 'content-type': 'application/json' });
            res.end(
              JSON.stringify({
                error: 'no stored auth token — run: npx @workday/everywhere auth login',
              })
            );
            return;
          }

          const forwarder = createTenantForwarder({
            gateway: resolved.gateway,
            tenant: resolved.tenant,
            getToken: async () => resolved.token,
          });
          await forwarder(req, res);
        }
      );
    },
  };
}
