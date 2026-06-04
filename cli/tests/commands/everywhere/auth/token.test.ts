import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '@oclif/core/config';
import type { AppConfig, ConfigProvider } from '../../../../src/config.js';
import AuthTokenCommand from '../../../../src/commands/everywhere/auth/token.js';
import EverywhereBaseCommand from '../../../../src/lib/command.js';
import { GatewayRequestError } from '../../../../src/gateway/client.js';

vi.mock('../../../../src/config.js', () => ({
  appConfig: vi.fn(),
  setPluginDir: vi.fn(),
}));

vi.mock('../../../../src/gateway/client.js', async () => {
  const actual = await vi.importActual<typeof import('../../../../src/gateway/client.js')>(
    '../../../../src/gateway/client.js'
  );
  return {
    ...actual,
    GatewayClient: {
      fromCommand: vi.fn(),
    },
  };
});

import { appConfig } from '../../../../src/config.js';
import { GatewayClient } from '../../../../src/gateway/client.js';

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
    let getTextSpy: ReturnType<typeof vi.fn>;

    const loggedInConfig: AppConfig = {
      auth: { gateway: 'https://gateway.example.com', token: 'test-token' },
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
      getTextSpy = vi.fn().mockResolvedValue('{"token":"new-token"}');
      vi.mocked(GatewayClient.fromCommand).mockReturnValue({
        getText: getTextSpy,
      } as unknown as ReturnType<typeof GatewayClient.fromCommand>);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('builds the client with the saved gateway and token', async () => {
      await cmd.run();

      expect(GatewayClient.fromCommand).toHaveBeenCalledWith(cmd, {
        gateway: 'https://gateway.example.com',
        token: 'test-token',
      });
    });

    it('calls /api/v1/auth/token on the client', async () => {
      await cmd.run();

      expect(getTextSpy).toHaveBeenCalledWith('/api/v1/auth/token');
    });

    it('prints the parsed token by default', async () => {
      const logSpy = vi.spyOn(cmd, 'log').mockImplementation(() => {});

      await cmd.run();

      expect(logSpy).toHaveBeenCalledWith('new-token');
    });

    it('prints the raw body when --json is set', async () => {
      vi.spyOn(
        cmd as unknown as { parseFlags: () => Promise<{ flags: { json: boolean } }> },
        'parseFlags'
      ).mockResolvedValue({ flags: { json: true } });
      getTextSpy.mockResolvedValue('{"token":"new-token","extra":1}');
      const logSpy = vi.spyOn(cmd, 'log').mockImplementation(() => {});

      await cmd.run();

      expect(logSpy).toHaveBeenCalledWith('{"token":"new-token","extra":1}');
    });

    it('errors when the response body is not valid JSON', async () => {
      getTextSpy.mockResolvedValue('not-json');

      await expect(cmd.run()).rejects.toThrow('Gateway response was not valid JSON.');
    });

    it('errors when the response is missing a token field', async () => {
      getTextSpy.mockResolvedValue('{}');

      await expect(cmd.run()).rejects.toThrow('Gateway response did not contain a `token` field.');
    });

    it('surfaces the client error message', async () => {
      getTextSpy.mockRejectedValue(
        new GatewayRequestError(
          'GET https://gateway.example.com/api/v1/auth/token failed: HTTP 401 Unauthorized',
          {
            method: 'GET',
            url: 'https://gateway.example.com/api/v1/auth/token',
            status: 401,
          }
        )
      );

      await expect(cmd.run()).rejects.toThrow(
        'GET https://gateway.example.com/api/v1/auth/token failed: HTTP 401 Unauthorized'
      );
    });

    it('errors when not authenticated', async () => {
      vi.mocked(appConfig).mockReturnValue(makeConfigProvider({}));

      await expect(cmd.run()).rejects.toThrow(/Not authenticated/);
    });
  });
});
