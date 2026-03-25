import * as path from 'node:path';
import { createJiti } from 'jiti';

import EverywhereBaseCommand from './base';

export default class InfoCommand extends EverywhereBaseCommand {
  static description = 'Show details for a Workday Everywhere plugin.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const pluginDir = await this.parsePluginDir();
    const pluginFile = path.join(pluginDir, 'plugin.ts');

    this.log(`Plugin directory: ${pluginDir}`);

    const jiti = createJiti(pluginDir);
    const mod = await jiti.import(pluginFile);
    const definition = (mod as { default: Record<string, unknown> }).default;

    if (definition.name) this.log(`Name: ${definition.name}`);
    if (definition.version) this.log(`Version: ${definition.version}`);
    if (definition.description) this.log(`Description: ${definition.description}`);
  }
}
