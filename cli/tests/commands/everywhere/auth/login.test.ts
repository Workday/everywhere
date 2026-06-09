import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '@oclif/core/config';
import type { AppConfig, ConfigProvider } from '../../../../src/config.js';
import LoginCommand from '../../../../src/commands/everywhere/auth/login.js';
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

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fake-signature`;
}

describe('everywhere auth login', () => {
  it('exists as a command class', () => {
    expect(LoginCommand).toBeDefined();
  });

  describe('description', () => {
    it('describes token-based authentication', () => {
      expect(LoginCommand.description).toBe(
        'Authenticate with a Workday server using an access token.'
      );
    });
  });

  describe('flags', () => {
    it('has a gateway flag', () => {
      expect(LoginCommand.flags['gateway']).toBeDefined();
    });

    it('has a token flag', () => {
      expect(LoginCommand.flags['token']).toBeDefined();
    });

    it('inherits the plugin-dir flag from the base command', () => {
      expect(LoginCommand.flags['plugin-dir']).toBe(EverywhereBaseCommand.baseFlags['plugin-dir']);
    });
  });

  describe('run', () => {
    let cmd: LoginCommand;
    let writeSpy: ReturnType<typeof vi.fn>;
    let getJsonSpy: ReturnType<typeof vi.fn>;

    const baseConfig: AppConfig = {
      auth: { gateway: 'https://gateway.example.com' },
    };

    const makeConfigProvider = (data: AppConfig) =>
      ({
        read: () => data,
        write: writeSpy,
        path: '',
      }) as ConfigProvider<AppConfig>;

    beforeEach(() => {
      writeSpy = vi.fn();
      getJsonSpy = vi.fn().mockResolvedValue({ sub: 'user-123', tenant: 'tenant-abc' });
      cmd = new LoginCommand([], {} as Config);
      vi.spyOn(cmd, 'parse').mockResolvedValue({
        flags: {
          token: makeJwt({ sub: 'user-123', exp: 9999999999 }),
        },
      } as unknown as Awaited<ReturnType<LoginCommand['parse']>>);
      vi.mocked(appConfig).mockReturnValue(makeConfigProvider(baseConfig));
      vi.mocked(GatewayClient.fromCommand).mockReturnValue({
        getJson: getJsonSpy,
      } as unknown as ReturnType<typeof GatewayClient.fromCommand>);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('builds the client with a logger and the gateway and token', async () => {
      const token = makeJwt({ sub: 'user-123', exp: 9999999999 });
      vi.spyOn(cmd, 'parse').mockResolvedValue({
        flags: { token },
      } as unknown as Awaited<ReturnType<LoginCommand['parse']>>);

      await cmd.run();

      expect(GatewayClient.fromCommand).toHaveBeenCalledWith(
        expect.objectContaining({ isVerbose: expect.any(Boolean), log: expect.any(Function) }),
        { gateway: 'https://gateway.example.com', token }
      );
    });

    it('calls /api/v1/me on the client', async () => {
      await cmd.run();

      expect(getJsonSpy).toHaveBeenCalledWith('/api/v1/me');
    });

    it('writes config after successful token validation', async () => {
      await cmd.run();

      expect(writeSpy).toHaveBeenCalledWith({
        auth: {
          gateway: 'https://gateway.example.com',
          token: makeJwt({ sub: 'user-123', exp: 9999999999 }),
        },
      });
    });

    it('does not write config when the client throws', async () => {
      getJsonSpy.mockRejectedValue(
        new GatewayRequestError('GET https://gateway.example.com/api/v1/me failed: HTTP 401', {
          method: 'GET',
          url: 'https://gateway.example.com/api/v1/me',
          status: 401,
        })
      );

      await cmd.run().catch(() => {});

      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('surfaces the client error message', async () => {
      getJsonSpy.mockRejectedValue(
        new GatewayRequestError('GET https://gateway.example.com/api/v1/me failed: HTTP 401', {
          method: 'GET',
          url: 'https://gateway.example.com/api/v1/me',
          status: 401,
        })
      );

      await expect(cmd.run()).rejects.toThrow(
        'GET https://gateway.example.com/api/v1/me failed: HTTP 401'
      );
    });

    describe('identity validation', () => {
      it('errors when the response is missing sub', async () => {
        getJsonSpy.mockResolvedValue({ tenant: 'tenant-abc' });

        await expect(cmd.run()).rejects.toThrow(
          'Token validation response missing identity fields.'
        );
      });

      it('errors when the response is missing tenant', async () => {
        getJsonSpy.mockResolvedValue({ sub: 'user-123' });

        await expect(cmd.run()).rejects.toThrow(
          'Token validation response missing identity fields.'
        );
      });
    });

    describe('verbose output', () => {
      let logSpy: ReturnType<typeof vi.spyOn>;

      beforeEach(() => {
        Object.defineProperty(cmd, 'isVerbose', { get: () => true, configurable: true });
        logSpy = vi.spyOn(cmd, 'log').mockImplementation(() => {});
      });

      it('logs the identity on successful verification', async () => {
        await cmd.run();

        expect(logSpy).toHaveBeenCalledWith('Authenticated as user-123 on tenant tenant-abc');
      });
    });

    describe('non-verbose output', () => {
      it('does not emit identity log when verbose is off', async () => {
        const logSpy = vi.spyOn(cmd, 'log').mockImplementation(() => {});

        await cmd.run();

        const identityCalls = logSpy.mock.calls.filter(
          ([msg]) => typeof msg === 'string' && msg.startsWith('Authenticated as ')
        );
        expect(identityCalls).toHaveLength(0);
      });
    });
  });
});
