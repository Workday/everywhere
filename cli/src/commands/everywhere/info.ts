import EverywhereBaseCommand from './base';

export default class InfoCommand extends EverywhereBaseCommand {
  static description = 'Show details for a Workday Everywhere plugin.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const pluginDir = await this.parsePluginDir();
    const { info } = await import('@workday/everywhere');
    info({ pluginDir });
  }
}
