import chalk from 'chalk';
import EverywhereBaseCommand from '../base.js';
import { readConfig } from '../../../config.js';
import { isTokenExpired, decodeToken } from '../../../auth/token.js';

export default class AuthStatusCommand extends EverywhereBaseCommand {
  static description = 'Show current authentication status.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const config = readConfig();
    const token = config.auth?.token;

    if (!token) {
      this.log(chalk.red('Status: Not authenticated'));
      return;
    }

    const gateway = config.auth?.gateway ?? 'unknown';
    this.log(`Gateway: ${gateway}`);

    if (isTokenExpired(token)) {
      this.log(chalk.yellow('Status: Token expired'));
    } else {
      this.log(chalk.green('Status: Authenticated'));
    }

    const payload = decodeToken(token);
    if (payload.exp) {
      const expiry = new Date(payload.exp * 1000).toLocaleString();
      this.log(`Token expires: ${expiry}`);
    }
  }
}
