import chalk from 'chalk';
import EverywhereBaseCommand from '../base.js';
import { readConfig } from '../../../config.js';

const DEFAULT_GATEWAY = 'api.workday.com';

export default class AuthTokenCommand extends EverywhereBaseCommand {
  static description = 'Fetch and display an access token from the gateway.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const config = readConfig();
    const token = config.auth?.token;

    if (!token) {
      this.error(chalk.red('Not authenticated. Run `everywhere auth login` first.'));
    }

    const gateway = config.auth?.gateway ?? DEFAULT_GATEWAY;
    const scheme = (config.auth?.https ?? true) ? 'https' : 'http';
    const url = `${scheme}://${gateway}/auth/token`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      this.error(`Token request failed (HTTP ${response.status})`);
    }

    const data = await response.text();
    this.log(data);
  }
}
