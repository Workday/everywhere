import chalk from 'chalk';
import { Flags } from '@oclif/core';
import EverywhereBaseCommand from '../base.js';
import { readConfig, DEFAULT_GATEWAY, DEFAULT_HTTPS } from '../../../global-config.js';

export default class AuthTokenCommand extends EverywhereBaseCommand {
  static description = 'Fetch and display an access token from the gateway.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
    json: Flags.boolean({
      description: 'Output the full JSON response body instead of just the token.',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(AuthTokenCommand);
    const config = readConfig();
    const token = config.auth?.token;

    if (!token) {
      this.error(chalk.red('Not authenticated. Run `everywhere auth login` first.'));
    }

    const gateway = config.auth?.gateway ?? DEFAULT_GATEWAY;
    const scheme = (config.auth?.https ?? DEFAULT_HTTPS) ? 'https' : 'http';
    const url = `${scheme}://${gateway}/auth/token`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.error(`Token request failed: ${message}`);
    }

    if (!response.ok) {
      this.error(`Token request failed (HTTP ${response.status})`);
    }

    const body = await response.text();

    if (flags.json) {
      this.log(body);
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      this.error('Gateway response was not valid JSON.');
    }
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as { token?: unknown }).token !== 'string'
    ) {
      this.error('Gateway response did not contain a `token` field.');
    }
    this.log((parsed as { token: string }).token);
  }
}
