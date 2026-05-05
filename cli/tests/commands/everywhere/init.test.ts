import { describe, it, expect, vi, beforeEach } from 'vitest';
import InitCommand from '../../../src/commands/everywhere/init.js';
import EverywhereBaseCommand from '../../../src/lib/command.js';

describe('everywhere init', () => {
  it('exists as a command class', () => {
    expect(InitCommand).toBeDefined();
  });

  describe('visibility', () => {
    it('is not hidden from command listings', () => {
      expect(InitCommand.hidden).not.toBe(true);
    });
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

    it('has an optional title flag with short alias T', () => {
      const flag = InitCommand.flags['title'];
      expect(flag).toBeDefined();
    });

    it('uses T as the short alias for the title flag', () => {
      const flag = InitCommand.flags['title'] as { char?: string };
      expect(flag.char).toBe('T');
    });

    it('has an optional yes flag', () => {
      expect(InitCommand.flags['yes']).toBeDefined();
    });

    it('uses y as the short alias for the yes flag', () => {
      const flag = InitCommand.flags['yes'] as { char?: string };
      expect(flag.char).toBe('y');
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

  describe('spawn invocation', () => {
    it('does not enable shell mode (avoids DEP0190)', async () => {
      const mockOn = vi.fn().mockImplementation((event: string, cb: (code: number) => void) => {
        if (event === 'close') cb(0);
      });
      const mockSpawn = vi.fn().mockReturnValue({ on: mockOn });

      vi.doMock('node:child_process', () => ({ spawn: mockSpawn }));

      const { runNpmInstall } = await import('../../../src/commands/everywhere/init.js');
      await runNpmInstall('/fake/dir');

      const opts = mockSpawn.mock.calls[0][2] as { shell?: boolean };
      expect(opts.shell).not.toBe(true);
    });
  });
});

describe('promptYesNo', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('when the user answers "y"', () => {
    it('resolves to true', async () => {
      vi.doMock('node:readline', () => ({
        createInterface: vi.fn().mockReturnValue({
          question: vi.fn().mockImplementation((_q: string, cb: (a: string) => void) => cb('y')),
          close: vi.fn(),
        }),
      }));
      const { promptYesNo } = await import('../../../src/commands/everywhere/init.js');
      await expect(promptYesNo('Continue?')).resolves.toBe(true);
    });
  });

  describe('when the user answers "Y"', () => {
    it('resolves to true', async () => {
      vi.doMock('node:readline', () => ({
        createInterface: vi.fn().mockReturnValue({
          question: vi.fn().mockImplementation((_q: string, cb: (a: string) => void) => cb('Y')),
          close: vi.fn(),
        }),
      }));
      const { promptYesNo } = await import('../../../src/commands/everywhere/init.js');
      await expect(promptYesNo('Continue?')).resolves.toBe(true);
    });
  });

  describe('when the user presses Enter (empty answer)', () => {
    it('resolves to true', async () => {
      vi.doMock('node:readline', () => ({
        createInterface: vi.fn().mockReturnValue({
          question: vi.fn().mockImplementation((_q: string, cb: (a: string) => void) => cb('')),
          close: vi.fn(),
        }),
      }));
      const { promptYesNo } = await import('../../../src/commands/everywhere/init.js');
      await expect(promptYesNo('Continue?')).resolves.toBe(true);
    });
  });

  describe('when the user answers "n"', () => {
    it('resolves to false', async () => {
      vi.doMock('node:readline', () => ({
        createInterface: vi.fn().mockReturnValue({
          question: vi.fn().mockImplementation((_q: string, cb: (a: string) => void) => cb('n')),
          close: vi.fn(),
        }),
      }));
      const { promptYesNo } = await import('../../../src/commands/everywhere/init.js');
      await expect(promptYesNo('Continue?')).resolves.toBe(false);
    });
  });

  describe('when the user answers "N"', () => {
    it('resolves to false', async () => {
      vi.doMock('node:readline', () => ({
        createInterface: vi.fn().mockReturnValue({
          question: vi.fn().mockImplementation((_q: string, cb: (a: string) => void) => cb('N')),
          close: vi.fn(),
        }),
      }));
      const { promptYesNo } = await import('../../../src/commands/everywhere/init.js');
      await expect(promptYesNo('Continue?')).resolves.toBe(false);
    });
  });

  describe('when the user answers "no"', () => {
    it('resolves to false', async () => {
      vi.doMock('node:readline', () => ({
        createInterface: vi.fn().mockReturnValue({
          question: vi.fn().mockImplementation((_q: string, cb: (a: string) => void) => cb('no')),
          close: vi.fn(),
        }),
      }));
      const { promptYesNo } = await import('../../../src/commands/everywhere/init.js');
      await expect(promptYesNo('Continue?')).resolves.toBe(false);
    });
  });
});

describe('runNpmInit', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('when npm init succeeds', () => {
    it('resolves the promise', async () => {
      const mockOn = vi.fn().mockImplementation((event: string, cb: (code: number) => void) => {
        if (event === 'close') cb(0);
      });
      const mockSpawn = vi.fn().mockReturnValue({ on: mockOn });

      vi.doMock('node:child_process', () => ({ spawn: mockSpawn }));

      const { runNpmInit } = await import('../../../src/commands/everywhere/init.js');

      await expect(runNpmInit('/fake/dir')).resolves.toBeUndefined();
    });
  });

  describe('when called without yes', () => {
    it('does not pass -y to npm init', async () => {
      const mockOn = vi.fn().mockImplementation((event: string, cb: (code: number) => void) => {
        if (event === 'close') cb(0);
      });
      const mockSpawn = vi.fn().mockReturnValue({ on: mockOn });

      vi.doMock('node:child_process', () => ({ spawn: mockSpawn }));

      const { runNpmInit } = await import('../../../src/commands/everywhere/init.js');
      await runNpmInit('/fake/dir');

      expect(mockSpawn).toHaveBeenCalledWith('npm', ['init'], expect.any(Object));
    });
  });

  describe('when called with yes=true', () => {
    it('passes -y to npm init', async () => {
      const mockOn = vi.fn().mockImplementation((event: string, cb: (code: number) => void) => {
        if (event === 'close') cb(0);
      });
      const mockSpawn = vi.fn().mockReturnValue({ on: mockOn });

      vi.doMock('node:child_process', () => ({ spawn: mockSpawn }));

      const { runNpmInit } = await import('../../../src/commands/everywhere/init.js');
      await runNpmInit('/fake/dir', { yes: true });

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        ['init', '-y'],
        expect.any(Object)
      );
    });
  });

  describe('spawn invocation', () => {
    it('does not enable shell mode (avoids DEP0190)', async () => {
      const mockOn = vi.fn().mockImplementation((event: string, cb: (code: number) => void) => {
        if (event === 'close') cb(0);
      });
      const mockSpawn = vi.fn().mockReturnValue({ on: mockOn });

      vi.doMock('node:child_process', () => ({ spawn: mockSpawn }));

      const { runNpmInit } = await import('../../../src/commands/everywhere/init.js');
      await runNpmInit('/fake/dir');

      const opts = mockSpawn.mock.calls[0][2] as { shell?: boolean };
      expect(opts.shell).not.toBe(true);
    });
  });

  describe('when npm init fails', () => {
    it('rejects with the exit code in the error message', async () => {
      const mockOn = vi.fn().mockImplementation((event: string, cb: (code: number) => void) => {
        if (event === 'close') cb(1);
      });
      const mockSpawn = vi.fn().mockReturnValue({ on: mockOn });

      vi.doMock('node:child_process', () => ({ spawn: mockSpawn }));

      const { runNpmInit } = await import('../../../src/commands/everywhere/init.js');

      await expect(runNpmInit('/fake/dir')).rejects.toThrow('npm init failed with exit code 1');
    });
  });

  describe('when spawn emits an error', () => {
    it('rejects with the error message', async () => {
      const mockOn = vi.fn().mockImplementation((event: string, cb: (err: Error) => void) => {
        if (event === 'error') cb(new Error('spawn ENOENT'));
      });
      const mockSpawn = vi.fn().mockReturnValue({ on: mockOn });

      vi.doMock('node:child_process', () => ({ spawn: mockSpawn }));

      const { runNpmInit } = await import('../../../src/commands/everywhere/init.js');

      await expect(runNpmInit('/fake/dir')).rejects.toThrow(
        'Failed to start npm init: spawn ENOENT'
      );
    });
  });
});
