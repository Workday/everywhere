import EverywhereBaseCommand from './base.js';

export default class InitCommand extends EverywhereBaseCommand {
  static description = 'Scaffold a stub Workday Everywhere plugin in an existing npm project.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    // Implementation lands in Task 3
  }
}
