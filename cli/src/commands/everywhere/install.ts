import * as fs from 'node:fs';
import { join, resolve } from 'node:path';

import { Flags } from '@oclif/core';

import { bundlePlugin, packagePlugin, slugify } from '../../build/index.js';
import { pluginConfig } from '../../config.js';
import EverywhereBaseCommand from './base.js';

export default class InstallCommand extends EverywhereBaseCommand {
  static description = 'Build and install a plugin to a local directory.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
    path: Flags.directory({
      description: 'Target directory for the installed plugin. Saved for future runs.',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(InstallCommand);
    const pluginDir = await this.parsePluginDir();
    const config = pluginConfig();

    // Resolve install path
    let installPath: string;

    if (flags.path) {
      installPath = resolve(flags.path);
      config.write({ install: installPath });
    } else {
      const saved = config.read();
      if (!saved.install) {
        this.error('No install target configured. Run: everywhere install --path <dir>');
      }
      installPath = saved.install;
    }

    if (!fs.existsSync(installPath)) {
      this.error(`Install target directory does not exist: ${installPath}`);
    }

    // Read package.json
    const pkgPath = join(pluginDir, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      this.error('No package.json found in the plugin directory.');
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    if (!pkg.name) this.error('package.json is missing required field: name');
    if (!pkg.version) this.error('package.json is missing required field: version');

    // Build
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

    // Copy to install path
    const destPath = join(installPath, `${slug}.zip`);
    fs.copyFileSync(result.filePath, destPath);

    const sizeKB = (result.size / 1024).toFixed(1);
    this.log(`Installed → ${destPath} (${sizeKB} KB)`);
  }
}
