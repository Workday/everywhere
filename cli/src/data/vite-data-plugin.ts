import type { IncomingMessage, ServerResponse } from 'node:http';
import { appConfig } from '../config.js';
import { DEFAULT_GATEWAY } from '../auth/defaults.js';
import { createTenantForwarder } from './proxy-forwarder.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VitePlugin = any;

export function dataServicePlugin(_pluginDir: string): VitePlugin {
  return {
    name: 'workday-everywhere-data',
    configureServer(server: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      middlewares: { use: (...args: any[]) => void };
    }) {
      server.middlewares.use(
        '/api/v1/tenant',
        async (req: IncomingMessage, res: ServerResponse) => {
          const saved = appConfig().read();
          const gateway = saved.auth?.gateway ?? DEFAULT_GATEWAY;
          const token = saved.auth?.token ?? null;

          const forwarder = createTenantForwarder({
            gateway,
            getToken: async () => token,
          });
          await forwarder(req, res);
        }
      );
    },
  };
}
