import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '@oclif/core/config';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import BuildCommand from '../../../src/commands/everywhere/build.js';
import EverywhereBaseCommand from '../../../src/lib/command.js';

vi.mock('../../../src/build/index.js', () => ({
  bundlePlugin: vi.fn(),
  packagePlugin: vi.fn(),
  slugify: vi.fn(),
}));

import * as plugins from '../../../src/build/index.js';

describe('everywhere build', () => {
  it('exists as a command class', () => {
    expect(BuildCommand).toBeDefined();
  });

  describe('description', () => {
    it('describes building a plugin bundle', () => {
      expect(BuildCommand.description).toBe('Build a plugin bundle.');
    });
  });

  describe('flags', () => {
    it('inherits the plugin-dir flag from the base command', () => {
      expect(BuildCommand.flags['plugin-dir']).toBe(EverywhereBaseCommand.baseFlags['plugin-dir']);
    });
  });

  describe('run', () => {
    let cmd: BuildCommand;
    let pluginDir: string;

    beforeEach(() => {
      pluginDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-build-plugin-'));
      fs.writeFileSync(
        path.join(pluginDir, 'package.json'),
        JSON.stringify({ name: '@acme/test-plugin', version: '1.0.0' }),
        'utf-8'
      );
      cmd = new BuildCommand([], {} as Config);
      vi.spyOn(
        cmd as unknown as { parsePluginDir: () => Promise<string> },
        'parsePluginDir'
      ).mockResolvedValue(pluginDir);
      vi.mocked(plugins.slugify).mockReturnValue('acme-test-plugin');
      vi.mocked(plugins.bundlePlugin).mockResolvedValue({ js: '', assets: [] });
      vi.mocked(plugins.packagePlugin).mockResolvedValue({
        filePath: path.join(os.tmpdir(), 'bundle.zip'),
        size: 1024,
      } as unknown as Awaited<ReturnType<typeof plugins.packagePlugin>>);
    });

    afterEach(() => {
      fs.rmSync(pluginDir, { recursive: true, force: true });
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
