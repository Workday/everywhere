import { join, relative } from 'node:path';

import { bundlePlugin, packagePlugin, slugify } from '../../build/index.js';
import EverywhereBaseCommand from '../../lib/command.js';
import { type PluginManifest, readPluginManifest } from '../../manifest/manifest.js';

export default class BuildCommand extends EverywhereBaseCommand {
  static description = 'Build a plugin bundle.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const pluginDir = await this.parsePluginDir();
    const manifest = this.loadManifest(pluginDir);

    this.log('Bundling plugin...');
    const slug = slugify(manifest.name);
    const bundle = await bundlePlugin(pluginDir, slug, manifest.name);

    this.log('Packaging...');
    const outputDir = join(pluginDir, 'dist');
    const result = await packagePlugin({
      pluginDir,
      bundle,
      outputDir,
      slug,
      version: manifest.version,
    });

    const sizeKB = (result.size / 1024).toFixed(1);
    const displayPath = relative(pluginDir, result.filePath);
    this.log(`Build complete → ${displayPath} (${sizeKB} KB)`);
  }

  private loadManifest(pluginDir: string): PluginManifest {
    try {
      return readPluginManifest(pluginDir);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read package.json';
      this.error(`${message}\nUpdate package.json and re-run \`everywhere build\`.`);
    }
  }
}
