import * as fs from 'node:fs';
import * as path from 'node:path';

import EverywhereBaseCommand from './base';

export default class InfoCommand extends EverywhereBaseCommand {
  static description = 'Show details for a Workday Everywhere plugin.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const pluginDir = await this.parsePluginDir();
    const pkgPath = path.join(pluginDir, 'package.json');

    this.log(`Plugin directory: ${pluginDir}`);

    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.name) this.log(`Name: ${pkg.name}`);
      if (pkg.version) this.log(`Version: ${pkg.version}`);
      if (pkg.description) this.log(`Description: ${pkg.description}`);
    }
  }
}
