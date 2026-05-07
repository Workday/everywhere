import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '@oclif/core/config';
import type { AppConfig, ConfigProvider } from '../../../../src/config.js';
import AuthTokenCommand from '../../../../src/commands/everywhere/auth/token.js';
import EverywhereBaseCommand from '../../../../src/lib/command.js';

vi.mock('../../../../src/config.js', () => ({
  appConfig: vi.fn(),
  setPluginDir: vi.fn(),
}));

import { appConfig } from '../../../../src/config.js';

describe('everywhere auth token', () => {
  it('exists as a command class', () => {
    expect(AuthTokenCommand).toBeDefined();
  });

  describe('description', () => {
    it('describes fetching an access token', () => {
      expect(AuthTokenCommand.description).toBe(
        'Fetch and display an access token from the gateway.'
      );
    });
  });

  describe('flags', () => {
    it('inherits the plugin-dir flag from the base command', () => {
      expect(AuthTokenCommand.flags['plugin-dir']).toBe(
        EverywhereBaseCommand.baseFlags['plugin-dir']
      );
    });

    it('defines a --json flag for full payload output', () => {
      expect(AuthTokenCommand.flags['json']).toBeDefined();
    });
  });

  describe('run', () => {
    let cmd: AuthTokenCommand;

    const loggedInConfig: AppConfig = {
      auth: { gateway: 'gateway.example.com', https: false, token: 'test-token' },
    };

    const makeConfigProvider = (data: object) =>
      ({
        read: () => data,
        write: vi.fn(),
        path: '',
      }) as ConfigProvider<AppConfig>;

    beforeEach(() => {
      cmd = new AuthTokenCommand([], {} as Config);
      vi.spyOn(
        cmd as unknown as { parseFlags: () => Promise<{ flags: { json: boolean } }> },
        'parseFlags'
      ).mockResolvedValue({ flags: { json: false } });
      vi.mocked(appConfig).mockReturnValue(makeConfigProvider(loggedInConfig));
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          text: () => Promise.resolve('{"token":"new-token"}'),
        })
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it('fetches the token from the /api/v1/auth/token endpoint', async () => {
      await cmd.run();

      expect(fetch).toHaveBeenCalledWith(
        'http://gateway.example.com/api/v1/auth/token',
        expect.anything()
      );
    });

    it('uses https when auth.https is true', async () => {
      vi.mocked(appConfig).mockReturnValue(
        makeConfigProvider({ auth: { ...loggedInConfig.auth, https: true } })
      );

      await cmd.run();

      expect(fetch).toHaveBeenCalledWith(
        'https://gateway.example.com/api/v1/auth/token',
        expect.anything()
      );
    });
  });
});
