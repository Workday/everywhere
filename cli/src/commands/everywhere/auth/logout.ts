import chalk from 'chalk';
import EverywhereBaseCommand from '../../../lib/command.js';
import { appConfig } from '../../../config.js';

export default class AuthLogoutCommand extends EverywhereBaseCommand {
  static description = 'Log out and clear stored authentication token.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const config = appConfig();
    const saved = config.read();

    if (!saved.auth?.token) {
      this.log(chalk.yellow('Not currently authenticated.'));
      return;
    }

    config.write({ auth: { ...saved.auth, token: undefined } });
    this.log(chalk.green('Successfully logged out.'));
  }
}
