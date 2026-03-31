import * as fs from 'node:fs';
import { join, relative } from 'node:path';

import EverywhereBaseCommand from './base';

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

    // Build utilities are ESM; use dynamic import from this CJS module.
    const { bundlePlugin, extractPages, buildManifest, packagePlugin, slugify } =
      await import('../../../../dist/build/index.js');

    this.log('Bundling plugin...');
    const code = await bundlePlugin(pluginDir);

    const pages = await extractPages(code);

    const manifest = buildManifest({
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      pages,
    });

    this.log(`Name: ${manifest.name}`);
    this.log(`Version: ${manifest.version}`);
    if (manifest.description) {
      this.log(`Description: ${manifest.description}`);
    }

    this.log('Packaging...');
    const slug = slugify(manifest.name);
    const outputDir = join(pluginDir, 'dist');
    const result = await packagePlugin({
      manifest,
      bundleCode: code,
      outputDir,
      slug,
    });

    const sizeKB = (result.size / 1024).toFixed(1);
    const displayPath = relative(pluginDir, result.filePath);
    this.log(`Build complete → ${displayPath} (${sizeKB} KB)`);
  }
}
