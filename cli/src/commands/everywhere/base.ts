import { Command, Flags } from '@oclif/core';
import * as path from 'node:path';

export default abstract class EverywhereBaseCommand extends Command {
  static hidden = true;

  static baseFlags = {
    'plugin-dir': Flags.directory({
      char: 'D',
      description: 'Plugin directory (defaults to current working directory).',
      exists: true,
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
    return this._pluginDir;
  }
}
