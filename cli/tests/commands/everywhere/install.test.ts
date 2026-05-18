import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '@oclif/core/config';
import type { PluginConfig, ConfigProvider } from '../../../src/config.js';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import InstallCommand from '../../../src/commands/everywhere/install.js';
import EverywhereBaseCommand from '../../../src/lib/command.js';

vi.mock('../../../src/build/index.js', () => ({
  bundlePlugin: vi.fn(),
  packagePlugin: vi.fn(),
  slugify: vi.fn(),
}));

vi.mock('../../../src/config.js', () => ({
  pluginConfig: vi.fn(),
}));

import * as plugins from '../../../src/build/index.js';
import { pluginConfig } from '../../../src/config.js';

describe('everywhere install', () => {
  it('exists as a command class', () => {
    expect(InstallCommand).toBeDefined();
  });

  describe('description', () => {
    it('describes building and installing a plugin', () => {
      expect(InstallCommand.description).toBe('Build and install a plugin to a local directory.');
    });
  });

  describe('flags', () => {
    it('inherits the plugin-dir flag from the base command', () => {
      expect(InstallCommand.flags['plugin-dir']).toBe(
        EverywhereBaseCommand.baseFlags['plugin-dir']
      );
    });

    it('defines a path flag for the install target', () => {
      expect(InstallCommand.flags['path']).toBeDefined();
    });
  });

  describe('run', () => {
    let cmd: InstallCommand;
    let pluginDir: string;
    let installDir: string;
    let bundleFilePath: string;

    const makeConfigProvider = (data: object) =>
      ({
        read: () => data,
        write: vi.fn(),
        path: '',
      }) as ConfigProvider<PluginConfig>;

    const mockOclifConfig = {
      runHook: vi.fn().mockResolvedValue({ successes: [], failures: [] }),
    } as unknown as Config;

    beforeEach(() => {
      pluginDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-install-plugin-'));
      installDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-install-target-'));
      bundleFilePath = path.join(os.tmpdir(), 'bundle.zip');

      fs.writeFileSync(
        path.join(pluginDir, 'package.json'),
        JSON.stringify({ name: '@acme/test-plugin', version: '1.0.0' }),
        'utf-8'
      );
      fs.writeFileSync(bundleFilePath, 'zip-content');

      cmd = new InstallCommand(['--path', installDir], mockOclifConfig);
      vi.spyOn(
        cmd as unknown as { parsePluginDir: () => Promise<string> },
        'parsePluginDir'
      ).mockResolvedValue(pluginDir);

      vi.mocked(pluginConfig).mockReturnValue(makeConfigProvider({}));
      vi.mocked(plugins.slugify).mockReturnValue('acme-test-plugin');
      vi.mocked(plugins.bundlePlugin).mockResolvedValue({ js: '', assets: [] });
      vi.mocked(plugins.packagePlugin).mockResolvedValue({
        filePath: bundleFilePath,
        size: 1024,
      } as unknown as Awaited<ReturnType<typeof plugins.packagePlugin>>);
    });

    afterEach(() => {
      fs.rmSync(pluginDir, { recursive: true, force: true });
      fs.rmSync(installDir, { recursive: true, force: true });
      if (fs.existsSync(bundleFilePath)) {
        fs.rmSync(bundleFilePath);
      }
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it('calls bundlePlugin with pluginDir, slug, and pkg.name as appId', async () => {
      await cmd.run();

      expect(plugins.bundlePlugin).toHaveBeenCalledWith(
        pluginDir,
        'acme-test-plugin',
        '@acme/test-plugin'
      );
    });
  });
});
