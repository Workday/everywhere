import * as readline from 'node:readline';
import { Flags } from '@oclif/core';
import chalk from 'chalk';
import EverywhereBaseCommand from '../base.js';
import { appConfig } from '../../../config.js';
import { DEFAULT_GATEWAY, DEFAULT_HTTPS } from '../../../auth/defaults.js';
import { decodeToken } from '../../../auth/token.js';

export default class AuthLoginCommand extends EverywhereBaseCommand {
  static description = 'Authenticate with a Workday server using an access token.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
    gateway: Flags.string({
      description: 'Workday API gateway hostname.',
    }),
    https: Flags.boolean({
      description: 'Use HTTPS to contact the gateway (use --no-https to disable).',
      allowNo: true,
    }),
    token: Flags.string({
      description: 'Access token (omit to enter interactively).',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(AuthLoginCommand);
    const config = appConfig();
    const saved = config.read();
    const gateway = flags.gateway ?? saved.auth?.gateway ?? DEFAULT_GATEWAY;
    const https = flags.https ?? saved.auth?.https ?? DEFAULT_HTTPS;

    const token = flags.token ?? (await this.promptForToken());

    if (!token) {
      this.error('No token provided.');
    }

    try {
      decodeToken(token);
    } catch {
      this.error('Invalid token format. Please provide a valid JWT.');
    }

    config.write({ auth: { gateway, https, token } });
    this.log(chalk.green('Successfully authenticated.'));
  }

  private async promptForToken(): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr,
    });

    return new Promise<string>((resolve) => {
      rl.question('Paste your access token: ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }
}
