import { Flags } from '@oclif/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as vite from 'vite';

import { dataServicePlugin } from '../../data/vite-data-plugin.js';
import { isUnauthenticated } from '../../data/proxy-auth.js';
import { appConfig } from '../../config.js';
import { DEFAULT_GATEWAY, DEFAULT_HTTPS } from '../../auth/defaults.js';
import EverywhereBaseCommand from '../../lib/command.js';
import { UserConfig } from 'vite';

export default class ViewCommand extends EverywhereBaseCommand {
  static description = 'Preview a Workday Everywhere plugin in the browser.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
    port: Flags.integer({
      char: 'p',
      description: 'Port for the dev server.',
      default: 4242,
    }),
    open: Flags.boolean({
      description: 'Open the browser automatically.',
      default: true,
      allowNo: true,
    }),
    'mock-data': Flags.boolean({
      description:
        'Use local mock data instead of forwarding requests to the real GraphQL API. Defaults to false — real API is used when auth login credentials are present.',
      default: false,
      allowNo: true,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ViewCommand);
    const pluginDir = await this.parsePluginDir();
    const pluginEntry = this.resolvePluginEntry(pluginDir);

    // Compiled path: cli/dist/commands/everywhere/view.js.
    // From there, ../../ points at cli/dist and ../../viewer is the built viewer app.
    const cliDistRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
    const viewerDir = path.join(cliDistRoot, 'viewer');
    const sdkRoot = path.resolve(cliDistRoot, '..', '..');

    const {
      gateway = DEFAULT_GATEWAY,
      https = DEFAULT_HTTPS,
      token,
    } = appConfig().read().auth ?? {};
    const scheme = https ? 'https' : 'http';
    const apiServer = `${scheme}://${gateway}`;

    this.log(`Plugin: ${pluginEntry}`);
    this.log(`Starting viewer on port ${flags.port}...`);

    const plugins: UserConfig['plugins'] = flags['mock-data'] ? [dataServicePlugin(pluginDir)] : [];
    const overrides: UserConfig['server'] = flags['mock-data']
      ? {}
      : {
          proxy: {
            '/api/data/graphql': {
              target: apiServer,
              changeOrigin: true,
              configure: (proxy, _options) => {
                proxy.on('proxyReq', (proxyReq, req, _res) => {
                  if (isUnauthenticated(req.headers) && token) {
                    proxyReq.setHeader('Authorization', `Bearer ${token}`);
                  }
                });
              },
            },
          },
        };

    const server = await vite.createServer({
      root: viewerDir,
      configFile: false,
      plugins,
      server: {
        port: flags.port,
        open: flags.open,
        fs: {
          allow: [pluginDir, sdkRoot],
        },
        ...overrides,
      },
      resolve: {
        alias: {
          'virtual:plugin-entry': pluginEntry,
          'virtual:plugin-package': path.join(pluginDir, 'package.json'),
          'virtual:plugin-styles': fs.existsSync(path.join(pluginDir, 'plugin.css'))
            ? path.resolve(pluginDir, 'plugin.css')
            : path.join(viewerDir, 'empty-plugin-styles.css'),
        },
        dedupe: ['react', 'react-dom'],
      },
      optimizeDeps: {
        include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
      },
    });

    await server.listen();
    server.printUrls();

    // Keep the process alive until interrupted.
    const shutdown = async () => {
      await server.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}
