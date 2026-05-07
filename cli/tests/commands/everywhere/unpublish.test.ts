import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '@oclif/core/config';
import type { AppConfig, ConfigProvider } from '../../../src/config.js';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import UnpublishCommand from '../../../src/commands/everywhere/unpublish.js';
import EverywhereBaseCommand from '../../../src/lib/command.js';

vi.mock('../../../src/config.js', () => ({
  appConfig: vi.fn(),
  setPluginDir: vi.fn(),
}));

vi.mock('../../../src/registry/registry.js', () => ({
  deleteFromRegistry: vi.fn(),
}));

import { appConfig } from '../../../src/config.js';
import { deleteFromRegistry } from '../../../src/registry/registry.js';

describe('everywhere unpublish', () => {
  describe('when accessing the description', () => {
    it('should include information about unpublishing a plugin from the registry', () => {
      expect(UnpublishCommand.description).toBe(
        'Unpublishes your plugin from the Workday plugin registry.'
      );
    });
  });

  describe('flags', () => {
    it('inherits the plugin-dir flag from the base command', () => {
      expect(UnpublishCommand.flags).toMatchObject(EverywhereBaseCommand.baseFlags);
    });
  });

  describe('run', () => {
    let cmd: UnpublishCommand;
    let pluginDir: string;

    const loggedInConfig = {
      auth: { gateway: 'registry.example.com', token: 'test-auth-token' },
    };

    const makeConfigProvider = (data: object) => ({
      read: () => data,
      write: vi.fn(),
      path: '',
    });

    beforeEach(() => {
      pluginDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-unpublish-plugin-'));
      cmd = new UnpublishCommand([], {} as Config);
      vi.spyOn(
        cmd as unknown as { parsePluginDir: () => Promise<string> },
        'parsePluginDir'
      ).mockResolvedValue(pluginDir);
    });

    afterEach(() => {
      fs.rmSync(pluginDir, { recursive: true, force: true });
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    describe('when the user is not logged in', () => {
      describe('when there is no auth config', () => {
        it('errors with a login message', async () => {
          vi.mocked(appConfig).mockReturnValue(makeConfigProvider({}) as ConfigProvider<AppConfig>);

          await expect(cmd.run()).rejects.toThrow('You must be logged in to unpublish your plugin');
        });
      });

      describe('when the gateway is not configured', () => {
        it('errors with a login message', async () => {
          vi.mocked(appConfig).mockReturnValue(
            makeConfigProvider({ auth: { token: 'test-auth-token' } }) as ConfigProvider<AppConfig>
          );

          await expect(cmd.run()).rejects.toThrow('You must be logged in to unpublish your plugin');
        });
      });

      describe('when the token is not configured', () => {
        it('errors with a login message', async () => {
          vi.mocked(appConfig).mockReturnValue(
            makeConfigProvider({
              auth: { gateway: 'registry.example.com' },
            }) as ConfigProvider<AppConfig>
          );

          await expect(cmd.run()).rejects.toThrow('You must be logged in to unpublish your plugin');
        });
      });
    });

    describe('when the package manifest is invalid', () => {
      beforeEach(() => {
        vi.mocked(appConfig).mockReturnValue(
          makeConfigProvider(loggedInConfig) as ConfigProvider<AppConfig>
        );
      });

      describe('when package.json is missing', () => {
        it('errors with a missing manifest message', async () => {
          await expect(cmd.run()).rejects.toThrow('No package.json found in the plugin directory.');
        });
      });

      describe('when the name field is missing', () => {
        it('errors about the missing name field', async () => {
          fs.writeFileSync(
            path.join(pluginDir, 'package.json'),
            JSON.stringify({ version: '1.0.0' }),
            'utf-8'
          );

          await expect(cmd.run()).rejects.toThrow('package.json is missing required field: name');
        });
      });
    });

    describe('when the plugin is unpublished successfully', () => {
      beforeEach(() => {
        fs.writeFileSync(
          path.join(pluginDir, 'package.json'),
          JSON.stringify({ name: 'my-test-plugin', version: '1.0.0' }),
          'utf-8'
        );

        vi.mocked(appConfig).mockReturnValue(
          makeConfigProvider(loggedInConfig) as ConfigProvider<AppConfig>
        );
        vi.mocked(deleteFromRegistry).mockResolvedValue(undefined);
      });

      it('calls deleteFromRegistry with the plugin name and auth details', async () => {
        await cmd.run();

        expect(deleteFromRegistry).toHaveBeenCalledWith({
          gateway: 'registry.example.com',
          httpsEnabled: true,
          token: 'test-auth-token',
          appId: 'my-test-plugin',
        });
      });

      it('logs a success message', async () => {
        const logSpy = vi.spyOn(cmd, 'log');
        await cmd.run();

        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('my-test-plugin'));
      });

      describe('when auth.https is false', () => {
        beforeEach(() => {
          vi.mocked(appConfig).mockReturnValue(
            makeConfigProvider({
              auth: { ...loggedInConfig.auth, https: false },
            }) as ConfigProvider<AppConfig>
          );
        });

        it('calls deleteFromRegistry with httpsEnabled false', async () => {
          await cmd.run();

          expect(deleteFromRegistry).toHaveBeenCalledWith(
            expect.objectContaining({ httpsEnabled: false })
          );
        });
      });
    });

    describe('when the delete fails', () => {
      it('errors with the failure message', async () => {
        fs.writeFileSync(
          path.join(pluginDir, 'package.json'),
          JSON.stringify({ name: 'my-test-plugin', version: '1.0.0' }),
          'utf-8'
        );
        vi.mocked(appConfig).mockReturnValue(
          makeConfigProvider(loggedInConfig) as ConfigProvider<AppConfig>
        );
        vi.mocked(deleteFromRegistry).mockRejectedValue(
          new Error('There was an error unpublishing your plugin from the registry')
        );

        await expect(cmd.run()).rejects.toThrow(
          'There was an error unpublishing your plugin from the registry'
        );
      });
    });
  });
});
