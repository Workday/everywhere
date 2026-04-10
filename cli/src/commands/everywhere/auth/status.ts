import chalk from 'chalk';
import EverywhereBaseCommand from '../base.js';
import { appConfig } from '../../../config.js';
import { DEFAULT_GATEWAY, DEFAULT_HTTPS } from './defaults.js';
import { getTokenExpiryStatus, decodeToken } from '../../../auth/token.js';

export default class AuthStatusCommand extends EverywhereBaseCommand {
  static description = 'Show current authentication status.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const config = appConfig();
    const saved = config.read();
    const token = saved.auth?.token;

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

    const gateway = saved.auth?.gateway ?? DEFAULT_GATEWAY;
    const gatewayDisplay = gateway === DEFAULT_GATEWAY ? gateway : chalk.white.bold(gateway);
    this.log(`Gateway: ${gatewayDisplay}`);

    const https = saved.auth?.https ?? DEFAULT_HTTPS;
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
