import * as readline from 'node:readline';
import { Flags } from '@oclif/core';
import chalk from 'chalk';
import EverywhereBaseCommand from '../../../lib/command.js';
import { appConfig } from '../../../config.js';
import { DEFAULT_GATEWAY } from '../../../auth/defaults.js';
import { parseGatewayUrl } from '../../../auth/gateway.js';
import { decodeToken } from '../../../auth/token.js';
import { GatewayClient } from '../../../gateway/client.js';

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

    const client = GatewayClient.fromCommand(this, { gateway, token });

    let body: unknown;
    try {
      body = await client.getJson('/api/v1/me');
    } catch (err) {
      this.surfaceGatewayError(err);
    }

    if (
      !body ||
      typeof body !== 'object' ||
      typeof (body as Record<string, unknown>).sub !== 'string' ||
      typeof (body as Record<string, unknown>).tenant !== 'string'
    ) {
      this.error('Token validation response missing identity fields.');
    }
    const identity = body as { sub: string; tenant: string };
    if (this.isVerbose) {
      this.log(`Authenticated as ${identity.sub} on tenant ${identity.tenant}`);
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
