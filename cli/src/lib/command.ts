import { Command, Flags } from '@oclif/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { setPluginDir } from '../config.js';
import { GatewayRequestError, type VerboseLogger } from '../gateway/client.js';

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
      description: 'Show detailed output including stack traces and error codes.',
    }),
  };

  protected get isVerbose(): boolean {
    return this._verbose;
  }

  protected createGatewayLogger(): VerboseLogger {
    return Object.defineProperty({ log: (msg: string) => this.log(msg) }, 'isVerbose', {
      get: () => this._verbose,
      enumerable: true,
      configurable: true,
    }) as VerboseLogger;
  }

  protected surfaceGatewayError(err: unknown): never {
    if (err instanceof GatewayRequestError) this.error(err.message);
    throw err;
  }

  protected get pluginDir(): string {
    return this._pluginDir;
  }

  private _verbose = false;
  private _pluginDir = process.cwd();

  override async init(): Promise<void> {
    await super.init();
    const { flags } = await this.parse(this.constructor as typeof EverywhereBaseCommand);
    this._verbose = flags.verbose ?? false;
  }

  override async catch(error: Error & { code?: string; exitCode?: number }): Promise<void> {
    if (this._verbose) {
      const timestamp = new Date().toISOString();
      const stack = error.stack ?? `Error: ${error.message}`;
      this.warn(`[${timestamp}]\n${stack}`);
      if (error.code) {
        this.warn(`  code: ${error.code}`);
      }
      if (error.exitCode !== undefined) {
        this.warn(`  exit: ${error.exitCode}`);
      }
    }
    return super.catch(error);
  }

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
