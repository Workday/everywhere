import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '@oclif/core/config';
import type { AppConfig, ConfigProvider } from '../../../../src/config.js';
import LoginCommand from '../../../../src/commands/everywhere/auth/login.js';
import EverywhereBaseCommand from '../../../../src/lib/command.js';

vi.mock('../../../../src/config.js', () => ({
  appConfig: vi.fn(),
  setPluginDir: vi.fn(),
}));

import { appConfig } from '../../../../src/config.js';

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

    it('has an https flag', () => {
      expect(LoginCommand.flags['https']).toBeDefined();
    });

    it('allows disabling https via --no-https', () => {
      expect(LoginCommand.flags['https']).toMatchObject({ allowNo: true });
    });

    it('inherits the plugin-dir flag from the base command', () => {
      expect(LoginCommand.flags['plugin-dir']).toBe(EverywhereBaseCommand.baseFlags['plugin-dir']);
    });
  });

  describe('run', () => {
    let cmd: LoginCommand;
    let writeSpy: ReturnType<typeof vi.fn>;

    const baseConfig: AppConfig = {
      auth: { gateway: 'gateway.example.com', https: true },
    };

    const makeConfigProvider = (data: AppConfig) =>
      ({
        read: () => data,
        write: writeSpy,
        path: '',
      }) as ConfigProvider<AppConfig>;

    beforeEach(() => {
      writeSpy = vi.fn();
      cmd = new LoginCommand([], {} as Config);
      vi.spyOn(cmd, 'parse').mockResolvedValue({
        flags: {
          token: makeJwt({ sub: 'user-123', exp: 9999999999 }),
        },
      } as unknown as Awaited<ReturnType<LoginCommand['parse']>>);
      vi.mocked(appConfig).mockReturnValue(makeConfigProvider(baseConfig));
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
        })
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it('calls /api/v1/me to validate the token', async () => {
      await cmd.run();

      expect(fetch).toHaveBeenCalledWith(
        'https://gateway.example.com/api/v1/me',
        expect.anything()
      );
    });

    it('sends the token as a bearer authorization header', async () => {
      const token = makeJwt({ sub: 'user-123', exp: 9999999999 });
      vi.spyOn(cmd, 'parse').mockResolvedValue({
        flags: { token },
      } as unknown as Awaited<ReturnType<LoginCommand['parse']>>);

      await cmd.run();

      expect(fetch).toHaveBeenCalledWith(
        'https://gateway.example.com/api/v1/me',
        expect.objectContaining({
          headers: { Authorization: `Bearer ${token}` },
        })
      );
    });

    it('writes config after successful token validation', async () => {
      await cmd.run();

      expect(writeSpy).toHaveBeenCalledWith({
        auth: {
          gateway: 'gateway.example.com',
          https: true,
          token: makeJwt({ sub: 'user-123', exp: 9999999999 }),
        },
      });
    });

    it('does not write config when validation endpoint rejects the token', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
        })
      );

      await cmd.run().catch(() => {});

      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('reports an auth failure when validation endpoint returns non-ok', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
        })
      );

      await expect(cmd.run()).rejects.toThrow('Token validation failed (HTTP 401).');
    });
  });
});
