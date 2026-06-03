import * as readline from 'node:readline';
import { Flags } from '@oclif/core';
import chalk from 'chalk';
import EverywhereBaseCommand from '../../../lib/command.js';
import { appConfig } from '../../../config.js';
import { DEFAULT_GATEWAY } from '../../../auth/defaults.js';
import { parseGatewayUrl } from '../../../auth/gateway.js';
import { decodeToken } from '../../../auth/token.js';

export default class AuthLoginCommand extends EverywhereBaseCommand {
  static description = 'Authenticate with a Workday server using an access token.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
    gateway: Flags.string({
      description: 'Workday API gateway URL (e.g. https://api.workday.com).',
    }),
    token: Flags.string({
      description: 'Access token (omit to enter interactively).',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(AuthLoginCommand);
    const config = appConfig();
    const saved = config.read();

    let gateway: string;
    try {
      gateway = parseGatewayUrl(flags.gateway ?? saved.auth?.gateway ?? DEFAULT_GATEWAY);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.error(message);
    }

    const token = flags.token ?? (await this.promptForToken());

    if (!token) {
      this.error('No token provided.');
    }

    try {
      decodeToken(token);
    } catch {
      this.error('Invalid token format. Please provide a valid JWT.');
    }

    const url = new URL('/api/v1/me', gateway).toString();

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.error(`Token validation request failed: ${message}`);
    }

    if (!response.ok) {
      this.error(`Token validation failed (HTTP ${response.status}).`);
    }

    config.write({ auth: { gateway, token } });
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
