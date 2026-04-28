import * as fs from 'node:fs';
import * as path from 'node:path';

import * as plugins from '../../build/index.js';
import { type AppConfig, appConfig } from '../../config.js';
import { type PluginManifest, readPluginManifest } from '../../manifest/manifest.js';
import {
  type RegistryUploadOptions,
  type RegistryUploadResult,
  uploadToRegistry,
} from '../../registry/registry.js';
import EverywhereBaseCommand from './base.js';

export default class PublishCommand extends EverywhereBaseCommand {
  static override description = 'Builds and publishes your plugin to the Workday plugin registry.';

  static override flags = {
    ...EverywhereBaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const pluginDir = await this.parsePluginDir();
    const config = appConfig().read();

    const { gateway, token } = this.requireAuth(config);

    if (!fs.existsSync(pluginDir)) {
      this.error('The plugin directory does not exist');
    }

    const manifest = this.loadManifest(pluginDir);

    this.log('Bundling plugin...');
    const { archive, slug } = await this.buildPluginArchive(manifest, pluginDir);

    this.log('Publishing plugin...');
    const result = await this.publishPlugin({
      gateway,
      httpsEnabled: config.auth?.https ?? true,
      token,
      archivePath: archive.filePath,
      appRefId: slug,
    });

    this.log(this.formatSuccessMessage(result, config));
  }

  private requireAuth(config: AppConfig): { gateway: string; token: string } {
    const gateway = config.auth?.gateway;
    const token = config.auth?.token;
    if (!gateway || !token) {
      this.error('You must be logged in to publish your plugin');
    }
    return { gateway, token };
  }

  private async buildPluginArchive(manifest: PluginManifest, pluginDir: string) {
    const bundle = await plugins.bundlePlugin(pluginDir);
    for (const w of bundle.warnings) {
      this.warn(w);
    }
    const slug = plugins.slugify(manifest.name);
    const archive = await plugins.packagePlugin({
      pluginDir,
      bundle,
      outputDir: path.join(pluginDir, 'dist'),
      slug,
      version: manifest.version,
    });
    return { archive, slug };
  }

  private loadManifest(pluginDir: string): PluginManifest {
    try {
      return readPluginManifest(pluginDir);
    } catch (err) {
      this.error(err instanceof Error ? err.message : 'Failed to read package.json');
    }
  }

  private async publishPlugin(options: RegistryUploadOptions): Promise<RegistryUploadResult> {
    try {
      return await uploadToRegistry(options);
    } catch (err) {
      this.error(err instanceof Error ? err.message : 'Failed to upload plugin');
    }
  }

  private formatSuccessMessage(result: RegistryUploadResult, config: AppConfig): string {
    const scheme = (config.auth?.https ?? true) ? 'https' : 'http';
    return [
      `Successfully published your plugin: ${result.referenceId}`,
      '',
      `Log into ${scheme}://${config.auth?.gateway}/builder/preview to view and deploy your app`,
      '',
      `ID: ${result.id}`,
      `Status: ${result.status}`,
      `App type: ${result.appType}`,
      `Created by: ${result.creator}`,
    ].join('\n');
  }
}
