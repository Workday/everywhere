import chalk from 'chalk';
import EverywhereBaseCommand from '../base.js';
import { readConfig, writeConfig } from '../../../global-config.js';

export default class AuthLogoutCommand extends EverywhereBaseCommand {
  static description = 'Log out and clear stored authentication token.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const config = readConfig();

    if (!config.auth?.token) {
      this.log(chalk.yellow('Not currently authenticated.'));
      return;
    }

    writeConfig({ auth: { ...config.auth, token: undefined } });
    this.log(chalk.green('Successfully logged out.'));
  }
}
