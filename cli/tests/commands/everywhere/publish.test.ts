import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '@oclif/core/config';
import type { AppConfig, ConfigProvider } from '../../../src/config.js';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import PublishCommand from '../../../src/commands/everywhere/publish.js';
import EverywhereBaseCommand from '../../../src/commands/everywhere/base.js';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, openAsBlob: vi.fn() };
});

vi.mock('../../../src/config.js', () => ({
  appConfig: vi.fn(),
  setPluginDir: vi.fn(),
}));

vi.mock('../../../../dist/build/index.js', () => ({
  bundlePlugin: vi.fn(),
  packagePlugin: vi.fn(),
  slugify: vi.fn(),
}));

import { appConfig } from '../../../src/config.js';
import * as plugins from '../../../../dist/build/index.js';

describe('everywhere publish', () => {
  describe('when accessing the description', () => {
    it('should include information about publishing a plugin to the registry', () => {
      expect(PublishCommand.description).toBe(
        'Builds and publishes your plugin to the Workday plugin registry.'
      );
    });
  });

  describe('flags', () => {
    it('inherits the plugin-dir flag from the base command', () => {
      expect(PublishCommand.flags).toMatchObject(EverywhereBaseCommand.baseFlags);
    });
  });

  describe('run', () => {
    let cmd: PublishCommand;
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
      pluginDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-publish-plugin-'));
      cmd = new PublishCommand([], {} as Config);
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

          await expect(cmd.run()).rejects.toThrow('You must be logged in to publish your plugin');
        });
      });

      describe('when the gateway is not configured', () => {
        it('errors with a login message', async () => {
          vi.mocked(appConfig).mockReturnValue(
            makeConfigProvider({ auth: { token: 'test-auth-token' } }) as ConfigProvider<AppConfig>
          );

          await expect(cmd.run()).rejects.toThrow('You must be logged in to publish your plugin');
        });
      });

      describe('when the token is not configured', () => {
        it('errors with a login message', async () => {
          vi.mocked(appConfig).mockReturnValue(
            makeConfigProvider({
              auth: { gateway: 'https://registry.example.com' },
            }) as ConfigProvider<AppConfig>
          );

          await expect(cmd.run()).rejects.toThrow('You must be logged in to publish your plugin');
        });
      });
    });

    describe('when the plugin directory does not exist', () => {
      it('errors with a directory not found message', async () => {
        vi.mocked(appConfig).mockReturnValue(
          makeConfigProvider(loggedInConfig) as ConfigProvider<AppConfig>
        );
        vi.spyOn(
          cmd as unknown as { parsePluginDir: () => Promise<string> },
          'parsePluginDir'
        ).mockResolvedValue('/nonexistent/plugin/dir/for/testing');

        await expect(cmd.run()).rejects.toThrow('The plugin directory does not exist');
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

      describe('when package.json contains invalid JSON', () => {
        it('errors with a JSON parse error message', async () => {
          fs.writeFileSync(path.join(pluginDir, 'package.json'), 'not valid json { }', 'utf-8');

          await expect(cmd.run()).rejects.toThrow('package.json is not valid JSON');
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

      describe('when the name field is not a string', () => {
        it('errors about the invalid name field', async () => {
          fs.writeFileSync(
            path.join(pluginDir, 'package.json'),
            JSON.stringify({ name: 42, version: '1.0.0' }),
            'utf-8'
          );

          await expect(cmd.run()).rejects.toThrow('package.json is missing required field: name');
        });
      });

      describe('when the version field is missing', () => {
        it('errors about the missing version field', async () => {
          fs.writeFileSync(
            path.join(pluginDir, 'package.json'),
            JSON.stringify({ name: 'test-plugin' }),
            'utf-8'
          );

          await expect(cmd.run()).rejects.toThrow(
            'package.json is missing required field: version'
          );
        });
      });

      describe('when the version field is not a string', () => {
        it('errors about the invalid version field', async () => {
          fs.writeFileSync(
            path.join(pluginDir, 'package.json'),
            JSON.stringify({ name: 'test-plugin', version: 2 }),
            'utf-8'
          );

          await expect(cmd.run()).rejects.toThrow(
            'package.json is missing required field: version'
          );
        });
      });
    });

    describe('when the plugin is published successfully', () => {
      const registryUploadSuccessResponse = {
        id: 'abc123',
        referenceId: 'ref-456',
        status: 'published',
        appType: 'plugin',
        creator: 'user@example.com',
      };

      beforeEach(() => {
        fs.writeFileSync(
          path.join(pluginDir, 'package.json'),
          JSON.stringify({ name: 'my-test-plugin', version: '2.3.4' }),
          'utf-8'
        );

        vi.mocked(appConfig).mockReturnValue(
          makeConfigProvider(loggedInConfig) as ConfigProvider<AppConfig>
        );
        vi.mocked(plugins.bundlePlugin).mockResolvedValue('(()=>{})();');
        vi.mocked(plugins.slugify).mockReturnValue('my-test-plugin');
        vi.mocked(plugins.packagePlugin).mockResolvedValue({
          filePath: path.join(pluginDir, 'dist', 'my-test-plugin.zip'),
        } as unknown as Awaited<ReturnType<typeof plugins.packagePlugin>>);

        (fs.openAsBlob as ReturnType<typeof vi.fn>).mockResolvedValue(
          new Blob(['zip-content'], { type: 'application/zip' })
        );

        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(registryUploadSuccessResponse),
          })
        );
      });

      it('bundles the plugin from the plugin directory', async () => {
        await cmd.run();

        expect(plugins.bundlePlugin).toHaveBeenCalledWith(pluginDir);
      });

      it('packages the plugin with the correct parameters', async () => {
        await cmd.run();

        expect(plugins.packagePlugin).toHaveBeenCalledWith({
          pluginDir,
          bundleCode: '(()=>{})();',
          outputDir: path.join(pluginDir, 'dist'),
          slug: 'my-test-plugin',
          version: '2.3.4',
        });
      });

      it('posts the bundle to the https registry endpoint when auth.https is unset', async () => {
        await cmd.run();

        expect(fetch).toHaveBeenCalledWith(
          new URL('https://registry.example.com/builder/v1/apps/source/archive'),
          expect.objectContaining({ method: 'POST' })
        );
      });

      it('includes the app reference ID in the upload form', async () => {
        await cmd.run();

        const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
        const lastCall = calls[calls.length - 1];
        if (!lastCall) throw new Error('No fetch calls made');
        const [, options] = lastCall;
        const body = options.body as FormData;
        expect(body.get('appRefId')).toBe('my-test-plugin');
      });

      it('logs a success message with the registry response details', async () => {
        const logSpy = vi.spyOn(cmd, 'log');
        await cmd.run();

        expect(logSpy).toHaveBeenLastCalledWith(expect.stringContaining('abc123'));
      });

      describe('when auth.https is false', () => {
        beforeEach(() => {
          vi.mocked(appConfig).mockReturnValue(
            makeConfigProvider({
              auth: { ...loggedInConfig.auth, https: false },
            }) as ConfigProvider<AppConfig>
          );
        });

        it('posts the bundle to the http registry endpoint', async () => {
          await cmd.run();

          expect(fetch).toHaveBeenCalledWith(
            new URL('http://registry.example.com/builder/v1/apps/source/archive'),
            expect.objectContaining({ method: 'POST' })
          );
        });
      });
    });

    describe('when the upload fails', () => {
      it('errors with an upload failure message', async () => {
        fs.writeFileSync(
          path.join(pluginDir, 'package.json'),
          JSON.stringify({ name: 'my-test-plugin', version: '1.0.0' }),
          'utf-8'
        );

        vi.mocked(appConfig).mockReturnValue(
          makeConfigProvider(loggedInConfig) as ConfigProvider<AppConfig>
        );
        vi.mocked(plugins.bundlePlugin).mockResolvedValue('(()=>{})();');
        vi.mocked(plugins.slugify).mockReturnValue('my-test-plugin');
        vi.mocked(plugins.packagePlugin).mockResolvedValue({
          filePath: path.join(pluginDir, 'dist', 'my-test-plugin.zip'),
        } as unknown as Awaited<ReturnType<typeof plugins.packagePlugin>>);
        (fs.openAsBlob as ReturnType<typeof vi.fn>).mockResolvedValue(new Blob(['zip-content']));
        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue({
            ok: false,
            json: () => Promise.resolve({ error: 'Upload failed' }),
          })
        );

        await expect(cmd.run()).rejects.toThrow(
          'There was an error uploading your plugin to the registry'
        );
      });
    });
  });
});
