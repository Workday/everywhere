import * as readline from 'node:readline';
import { Flags } from '@oclif/core';
import chalk from 'chalk';
import EverywhereBaseCommand from '../../../lib/command.js';
import { appConfig } from '../../../config.js';
import { DEFAULT_GATEWAY, DEFAULT_HTTPS } from '../../../auth/defaults.js';
import { decodeToken } from '../../../auth/token.js';

function describeFetchError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  let current: Error = err;
  while (current.cause instanceof Error) {
    current = current.cause;
  }
  const code = (current as { code?: unknown }).code;
  return typeof code === 'string' ? `${code}: ${current.message}` : current.message;
}

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

    const scheme = https ? 'https' : 'http';
    const url = `${scheme}://${gateway}/api/v1/me`;

    if (this.isVerbose) {
      this.log(`Verifying token at ${url}`);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      const message = describeFetchError(err);
      if (this.isVerbose) {
        this.log(`Token verification request failed: ${message}`);
      }
      this.error(`Token validation request failed: ${message}`);
    }

    if (this.isVerbose) {
      this.log(`Token verification response: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      this.error(`Token validation failed (HTTP ${response.status}).`);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      this.error('Token validation response was not valid JSON.');
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
