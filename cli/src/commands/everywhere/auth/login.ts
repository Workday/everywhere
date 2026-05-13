import { Flags } from '@oclif/core';
import chalk from 'chalk';
import EverywhereBaseCommand from '../../../lib/command.js';
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

  /**
   * Prompts the user to paste an access token via stdin.
   *
   * Uses raw mode when connected to a TTY so keystrokes are not echoed to the
   * terminal — the token stays invisible while the user types or pastes it.
   *
   * Because raw mode disables default signal handling, Ctrl+C (\u0003) and
   * Ctrl+D (\u0004) are intercepted manually so the user can still abort.
   */
  private async promptForToken(): Promise<string> {
    process.stderr.write('Paste your access token: ');

    return new Promise<string>((resolve) => {
      let input = '';

      const onData = (chunk: Buffer) => {
        const str = chunk.toString();

        for (let i = 0; i < str.length; i++) {
          const ch = str[i];

          // Raw mode swallows Ctrl+C / Ctrl+D — handle them explicitly so the
          // user is never trapped in the prompt.
          if (ch === '\u0003' || ch === '\u0004') {
            cleanup();
            process.stderr.write('\n');
            process.exit(1);
          } else if (ch === '\n' || ch === '\r') {
            cleanup();
            process.stderr.write('\n');
            resolve(input.trim());
            return;
          } else if (ch === '\x7F' || ch === '\b') {
            input = input.slice(0, -1);
          } else if (ch >= ' ') {
            input += ch;
          }
        }
      };

      const cleanup = () => {
        process.stdin.removeListener('data', onData);
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdin.pause();
      };

      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }

      process.stdin.resume();
      process.stdin.on('data', onData);
    });
  }
}
