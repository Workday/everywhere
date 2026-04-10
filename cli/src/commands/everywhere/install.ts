import { Flags } from '@oclif/core';
import EverywhereBaseCommand from './base.js';

export default class InstallCommand extends EverywhereBaseCommand {
  static description = 'Build and install a plugin to a local directory.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
    path: Flags.directory({
      description: 'Target directory for the installed plugin. Saved for future runs.',
      exists: true,
    }),
  };

  async run(): Promise<void> {
    // implemented in Task 5
  }
}
