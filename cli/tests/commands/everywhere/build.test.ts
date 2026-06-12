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
      cmd = new BuildCommand([], {} as Config);
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

    describe('when package.json contains invalid JSON', () => {
      it('fails with the same manifest validation error used by publish', async () => {
        fs.writeFileSync(path.join(pluginDir, 'package.json'), 'not valid json { }', 'utf-8');

        await expect(cmd.run()).rejects.toThrow('package.json is not valid JSON');
      });
    });

    describe('when the name field is missing', () => {
      it('includes actionable guidance in the build failure', async () => {
        fs.writeFileSync(
          path.join(pluginDir, 'package.json'),
          JSON.stringify({ version: '1.0.0' }),
          'utf-8'
        );

        await expect(cmd.run()).rejects.toThrow(
          'Update package.json and re-run `everywhere build`.'
        );
      });
    });

    describe('when the manifest is valid', () => {
      beforeEach(() => {
        fs.writeFileSync(
          path.join(pluginDir, 'package.json'),
          JSON.stringify({ name: '@acme/test-plugin', version: '2.3.4', capabilities: {} }),
          'utf-8'
        );
        vi.mocked(plugins.bundlePlugin).mockResolvedValue({
          js: '(()=>{})();',
          assets: [],
        });
        vi.mocked(plugins.slugify).mockReturnValue('acme-test-plugin');
        vi.mocked(plugins.packagePlugin).mockResolvedValue({
          filePath: path.join(pluginDir, 'dist', 'acme-test-plugin.zip'),
          size: 1024,
          hash: 'abc123',
        } as Awaited<ReturnType<typeof plugins.packagePlugin>>);
      });

      it('builds the plugin bundle from the selected plugin directory', async () => {
        await cmd.run();

        expect(plugins.bundlePlugin).toHaveBeenCalledWith(
          pluginDir,
          'acme-test-plugin',
          '@acme/test-plugin'
        );
      });
    });
  });
});
