import chalk from 'chalk';
import EverywhereBaseCommand from '../base.js';
import { readConfig, DEFAULT_GATEWAY, DEFAULT_HTTPS } from '../../../global-config.js';
import { getTokenExpiryStatus, decodeToken } from '../../../auth/token.js';

export default class AuthStatusCommand extends EverywhereBaseCommand {
  static description = 'Show current authentication status.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const config = readConfig();
    const token = config.auth?.token;

    if (!token) {
      this.log(`Status: ${chalk.red.bold('Not authenticated')}`);
      return;
    }

    const expiryStatus = getTokenExpiryStatus(token);
    if (expiryStatus === 'expired') {
      this.log(`Status: ${chalk.yellow.bold('Token expired')}`);
    } else {
      this.log(`Status: ${chalk.green.bold('Authenticated')}`);
    }

    const gateway = config.auth?.gateway ?? DEFAULT_GATEWAY;
    const gatewayDisplay = gateway === DEFAULT_GATEWAY ? gateway : chalk.white.bold(gateway);
    this.log(`Gateway: ${gatewayDisplay}`);

    const https = config.auth?.https ?? DEFAULT_HTTPS;
    const httpsDisplay = https ? chalk.green('yes') : chalk.red.bold('no');
    this.log(`HTTPS: ${httpsDisplay}`);

    const payload = decodeToken(token);
    const expiryValue = payload.exp ? new Date(payload.exp * 1000).toLocaleString() : 'unknown';
    const colorize =
      expiryStatus === 'expired'
        ? chalk.red.bold
        : expiryStatus === 'unknown'
          ? chalk.yellow.bold
          : chalk.green.bold;
    this.log(`Token expires: ${colorize(expiryValue)}`);
  }
}
