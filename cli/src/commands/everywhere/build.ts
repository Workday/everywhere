import * as fs from 'node:fs';
import { join, relative } from 'node:path';

import { bundlePlugin, packagePlugin, slugify } from '../../../../dist/build/index.js';
import EverywhereBaseCommand from './base.js';

export default class BuildCommand extends EverywhereBaseCommand {
  static description = 'Build a plugin bundle.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const pluginDir = await this.parsePluginDir();

    const pkgPath = join(pluginDir, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      this.error('No package.json found in the plugin directory.');
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    if (!pkg.name) this.error('package.json is missing required field: name');
    if (!pkg.version) this.error('package.json is missing required field: version');

    this.log('Bundling plugin...');
    const code = await bundlePlugin(pluginDir);

    this.log('Packaging...');
    const slug = slugify(pkg.name);
    const outputDir = join(pluginDir, 'dist');
    const result = await packagePlugin({
      pluginDir,
      bundleCode: code,
      outputDir,
      slug,
      version: pkg.version,
    });

    const sizeKB = (result.size / 1024).toFixed(1);
    const displayPath = relative(pluginDir, result.filePath);
    this.log(`Build complete → ${displayPath} (${sizeKB} KB)`);
  }
}
