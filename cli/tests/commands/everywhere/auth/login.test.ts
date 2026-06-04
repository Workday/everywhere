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

    it('does not have an https flag', () => {
      expect(LoginCommand.flags['https']).toBeUndefined();
    });

    it('inherits the plugin-dir flag from the base command', () => {
      expect(LoginCommand.flags['plugin-dir']).toBe(EverywhereBaseCommand.baseFlags['plugin-dir']);
    });
  });

  describe('run', () => {
    let cmd: LoginCommand;
    let writeSpy: ReturnType<typeof vi.fn>;

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
          statusText: 'OK',
          json: () => Promise.resolve({ sub: 'user-123', tenant: 'tenant-abc' }),
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
          gateway: 'https://gateway.example.com',
          token: makeJwt({ sub: 'user-123', exp: 9999999999 }),
        },
      });
    });

    describe('when --gateway is a full URL with a trailing slash', () => {
      it('persists the normalized origin', async () => {
        const token = makeJwt({ sub: 'user-123', exp: 9999999999 });
        vi.spyOn(cmd, 'parse').mockResolvedValue({
          flags: { token, gateway: 'http://localhost:8080/' },
        } as unknown as Awaited<ReturnType<LoginCommand['parse']>>);

        await cmd.run();

        expect(writeSpy).toHaveBeenCalledWith({
          auth: { gateway: 'http://localhost:8080', token },
        });
      });
    });

    describe('when --gateway is not a valid URL', () => {
      it('errors without writing config', async () => {
        const token = makeJwt({ sub: 'user-123', exp: 9999999999 });
        vi.spyOn(cmd, 'parse').mockResolvedValue({
          flags: { token, gateway: 'not a url' },
        } as unknown as Awaited<ReturnType<LoginCommand['parse']>>);

        await expect(cmd.run()).rejects.toThrow(/gateway/i);
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

    describe('verbose output', () => {
      let logSpy: ReturnType<typeof vi.spyOn>;

      beforeEach(() => {
        Object.defineProperty(cmd, 'isVerbose', { get: () => true, configurable: true });
        logSpy = vi.spyOn(cmd, 'log').mockImplementation(() => {});
      });

      it('logs the verification URL before contacting the server', async () => {
        await cmd.run();

        expect(logSpy).toHaveBeenCalledWith(
          'Verifying token at https://gateway.example.com/api/v1/me'
        );
      });

      it('logs the response status on success', async () => {
        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: () => Promise.resolve({ sub: 'user-123', tenant: 'tenant-abc' }),
          })
        );

        await cmd.run();

        expect(logSpy).toHaveBeenCalledWith('Token verification response: 200 OK');
      });

      it('logs the response status before failing on non-2xx', async () => {
        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' })
        );

        await cmd.run().catch(() => {});

        expect(logSpy).toHaveBeenCalledWith('Token verification response: 401 Unauthorized');
      });

      it('logs the network error message when fetch throws', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED')));

        await cmd.run().catch(() => {});

        expect(logSpy).toHaveBeenCalledWith(
          'Token verification request failed: connect ECONNREFUSED'
        );
      });

      it('unwraps the underlying cause when fetch throws with a cause', async () => {
        const cause = Object.assign(new Error('unable to get local issuer certificate'), {
          code: 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
        });
        const err = new TypeError('fetch failed', { cause });
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(err));

        await cmd.run().catch(() => {});

        expect(logSpy).toHaveBeenCalledWith(
          'Token verification request failed: UNABLE_TO_GET_ISSUER_CERT_LOCALLY: unable to get local issuer certificate'
        );
      });

      it('falls back to the cause message when no code is present', async () => {
        const cause = new Error('socket hang up');
        const err = new TypeError('fetch failed', { cause });
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(err));

        await cmd.run().catch(() => {});

        expect(logSpy).toHaveBeenCalledWith('Token verification request failed: socket hang up');
      });

      it('logs the identity on successful verification', async () => {
        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: () => Promise.resolve({ sub: 'user-123', tenant: 'tenant-abc' }),
          })
        );

        await cmd.run();

        expect(logSpy).toHaveBeenCalledWith('Authenticated as user-123 on tenant tenant-abc');
      });
    });

    describe('non-verbose output', () => {
      it('does not emit verbose lines when verbose is off', async () => {
        const logSpy = vi.spyOn(cmd, 'log').mockImplementation(() => {});

        await cmd.run();

        const verboseCalls = logSpy.mock.calls.filter(
          ([msg]) =>
            typeof msg === 'string' &&
            (msg.startsWith('Verifying token at') ||
              msg.startsWith('Token verification response:') ||
              msg.startsWith('Token verification request failed:') ||
              msg.startsWith('Authenticated as '))
        );
        expect(verboseCalls).toHaveLength(0);
      });
    });

    describe('identity validation', () => {
      it('errors when the response body is not valid JSON', async () => {
        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: () => Promise.reject(new Error('Unexpected token')),
          })
        );

        await expect(cmd.run()).rejects.toThrow('Token validation response was not valid JSON.');
      });

      it('errors when the response body is missing identity fields', async () => {
        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: () => Promise.resolve({ sub: 'user-123' }),
          })
        );

        await expect(cmd.run()).rejects.toThrow(
          'Token validation response missing identity fields.'
        );
      });
    });
  });
});
