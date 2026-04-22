import { describe, it, expect, vi, beforeEach } from 'vitest';
import InitCommand from '../../../src/commands/everywhere/init.js';
import EverywhereBaseCommand from '../../../src/commands/everywhere/base.js';

describe('everywhere init', () => {
  it('exists as a command class', () => {
    expect(InitCommand).toBeDefined();
  });

  describe('description', () => {
    it('describes scaffolding a stub plugin', () => {
      expect(InitCommand.description).toBe(
        'Scaffold a stub Workday Everywhere plugin in an existing npm project.'
      );
    });
  });

  describe('flags', () => {
    it('inherits the plugin-dir flag from the base command', () => {
      expect(InitCommand.flags['plugin-dir']).toBe(EverywhereBaseCommand.baseFlags['plugin-dir']);
    });

    it('inherits the verbose flag from the base command', () => {
      expect(InitCommand.flags['verbose']).toBe(EverywhereBaseCommand.baseFlags['verbose']);
    });
  });
});

describe('runNpmInstall', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('when npm install succeeds', () => {
    it('resolves the promise', async () => {
      const mockOn = vi.fn().mockImplementation((event, cb) => {
        if (event === 'close') cb(0);
      });
      const mockSpawn = vi.fn().mockReturnValue({ on: mockOn });

      vi.doMock('node:child_process', () => ({ spawn: mockSpawn }));

      const { runNpmInstall } = await import('../../../src/commands/everywhere/init.js');

      await expect(runNpmInstall('/fake/dir')).resolves.toBeUndefined();
    });
  });

  describe('when npm install fails', () => {
    it('rejects with the exit code in the error message', async () => {
      const mockOn = vi.fn().mockImplementation((event, cb) => {
        if (event === 'close') cb(1);
      });
      const mockSpawn = vi.fn().mockReturnValue({ on: mockOn });

      vi.doMock('node:child_process', () => ({ spawn: mockSpawn }));

      const { runNpmInstall } = await import('../../../src/commands/everywhere/init.js');

      await expect(runNpmInstall('/fake/dir')).rejects.toThrow(
        'npm install failed with exit code 1'
      );
    });
  });

  describe('when spawn emits an error', () => {
    it('rejects with the error message', async () => {
      const mockOn = vi.fn().mockImplementation((event, cb) => {
        if (event === 'error') cb(new Error('spawn ENOENT'));
      });
      const mockSpawn = vi.fn().mockReturnValue({ on: mockOn });

      vi.doMock('node:child_process', () => ({ spawn: mockSpawn }));

      const { runNpmInstall } = await import('../../../src/commands/everywhere/init.js');

      await expect(runNpmInstall('/fake/dir')).rejects.toThrow(
        'Failed to start npm install: spawn ENOENT'
      );
    });
  });
});
