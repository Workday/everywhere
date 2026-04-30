import { Command, Flags } from '@oclif/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { setPluginDir } from '../config.js';

const PLUGIN_EXTENSIONS = ['.tsx', '.ts'];

export default abstract class EverywhereBaseCommand extends Command {
  static baseFlags = {
    'plugin-dir': Flags.directory({
      char: 'D',
      description: 'Plugin directory (defaults to current working directory).',
      exists: true,
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'Show detailed output.',
    }),
  };

  protected get pluginDir(): string {
    // Resolved during run() after flags are parsed
    return this._pluginDir;
  }

  private _pluginDir = process.cwd();

  protected async parsePluginDir(): Promise<string> {
    const { flags } = await this.parse(this.constructor as typeof EverywhereBaseCommand);
    const dir = flags['plugin-dir'];
    if (dir) {
      this._pluginDir = path.resolve(dir);
    }
    setPluginDir(this._pluginDir);
    return this._pluginDir;
  }

  protected resolvePluginEntry(pluginDir: string): string {
    const found = PLUGIN_EXTENSIONS.map((ext) => path.join(pluginDir, `plugin${ext}`)).find((f) =>
      fs.existsSync(f)
    );

    if (!found) {
      this.error('No plugin.ts or plugin.tsx found in the plugin directory.');
    }

    return found;
  }
}
