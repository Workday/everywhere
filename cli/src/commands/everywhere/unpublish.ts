import { type AppConfig, appConfig } from '../../config.js';
import { readPluginManifest } from '../../manifest/manifest.js';
import { deleteFromRegistry } from '../../registry/registry.js';
import EverywhereBaseCommand from '../../lib/command.js';

export default class UnpublishCommand extends EverywhereBaseCommand {
  static override description = 'Unpublishes your plugin from the Workday plugin registry.';

  static override flags = {
    ...EverywhereBaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const pluginDir = await this.parsePluginDir();
    const config = appConfig().read();

    const { gateway, token } = this.requireAuth(config);
    const name = this.loadPluginName(pluginDir);

    await this.unpublishPlugin({
      gateway,
      httpsEnabled: config.auth?.https ?? true,
      token,
      appId: name,
    });

    this.log(`Successfully unpublished plugin: ${name}`);
  }

  private requireAuth(config: AppConfig): { gateway: string; token: string } {
    const gateway = config.auth?.gateway;
    const token = config.auth?.token;
    if (!gateway || !token) {
      this.error('You must be logged in to unpublish your plugin');
    }
    return { gateway, token };
  }

  private loadPluginName(pluginDir: string): string {
    try {
      return readPluginManifest(pluginDir).name;
    } catch (err) {
      this.error(err instanceof Error ? err.message : 'Failed to read package.json');
    }
  }

  private async unpublishPlugin(options: Parameters<typeof deleteFromRegistry>[0]): Promise<void> {
    try {
      await deleteFromRegistry(options);
    } catch (err) {
      this.error(err instanceof Error ? err.message : 'Failed to unpublish plugin');
    }
  }
}
