import { Flags } from '@oclif/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as vite from 'vite';

import { dataServicePlugin } from '../../data/vite-data-plugin.js';
import { appConfig } from '../../config.js';
import { DEFAULT_GATEWAY, DEFAULT_HTTPS } from '../../auth/defaults.js';
import EverywhereBaseCommand from '../../lib/command.js';

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

    const auth = appConfig().read().auth ?? {};
    const scheme = (auth.https ?? DEFAULT_HTTPS) ? 'https' : 'http';
    const gateway = auth.gateway ?? DEFAULT_GATEWAY;
    const tridentEndpoint = `${scheme}://${gateway}/graphql/v5`;
    const tridentToken = auth.token ?? '';

    this.log(`Plugin: ${pluginEntry}`);
    this.log(`Starting viewer on port ${flags.port}...`);

    const server = await vite.createServer({
      root: viewerDir,
      configFile: false,
      plugins: [
        dataServicePlugin(pluginDir),
        {
          name: 'we-trident-globals',
          transformIndexHtml() {
            return [
              {
                tag: 'script',
                injectTo: 'head-prepend' as const,
                children: [
                  `globalThis.__WE_TRIDENT_ENDPOINT__ = ${JSON.stringify(tridentEndpoint)};`,
                  `globalThis.__WE_TRIDENT_TOKEN__ = ${JSON.stringify(tridentToken)};`,
                ].join('\n'),
              },
            ];
          },
        },
      ],
      server: {
        port: flags.port,
        open: flags.open,
        fs: {
          allow: [pluginDir, sdkRoot],
        },
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
