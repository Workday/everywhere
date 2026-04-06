import { Flags } from '@oclif/core';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as vite from 'vite';

import { dataServicePlugin } from '../../data/vite-data-plugin.js';
import EverywhereBaseCommand from './base.js';

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

    // Locate the SDK package root (where dist/viewer/ lives).
    // Compiled path: cli/dist/commands/everywhere/view.js → 4 levels up = SDK root.
    const sdkRoot = path.resolve(
      fileURLToPath(new URL('.', import.meta.url)),
      '..',
      '..',
      '..',
      '..'
    );
    const viewerDir = path.join(sdkRoot, 'dist', 'viewer');

    this.log(`Plugin: ${pluginEntry}`);
    this.log(`Starting viewer on port ${flags.port}...`);

    const server = await vite.createServer({
      root: viewerDir,
      configFile: false,
      plugins: [dataServicePlugin(pluginDir)],
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
