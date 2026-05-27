import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import InitCommand, {
  resolveTypeDevDependencies,
  writeTsConfigIfAbsent,
  writeAgentsMdIfAbsent,
} from '../../../src/commands/everywhere/init.js';
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

describe('resolveTypeDevDependencies', () => {
  describe('when desired dependencies use non-default versions', () => {
    it('aligns @types package versions with desired runtime dependency versions', () => {
      expect(
        resolveTypeDevDependencies({
          react: '^18.3.1',
          'react-dom': '^18.3.1',
        })
      ).toEqual({
        typescript: '^5',
        '@types/react': '^18.3.1',
        '@types/react-dom': '^18.3.1',
      });
    });
  });

  describe('when desired dependencies include react and react-dom', () => {
    it('returns @types packages for both dependencies', () => {
      expect(
        resolveTypeDevDependencies({
          react: '^19',
          'react-dom': '^19',
          '@workday/everywhere': '^1.0.0',
        })
      ).toEqual({
        typescript: '^5',
        '@types/react': '^19',
        '@types/react-dom': '^19',
      });
    });
  });

  describe('when desired dependencies have no mapped types package', () => {
    it('returns only the default development dependencies', () => {
      expect(resolveTypeDevDependencies({ '@workday/everywhere': '^1.0.0' })).toEqual({
        typescript: '^5',
      });
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

      const firstCall = mockSpawn.mock.calls[0];
      expect(firstCall).toBeDefined();
      const opts = firstCall?.[2] as { shell?: boolean };
      expect(opts.shell).not.toBe(true);
    });
  });
});

describe('promptYesNo', () => {
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    vi.resetModules();
    originalIsTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
  });

  describe('when stdin is not a TTY', () => {
    beforeEach(() => {
      Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    });

    it('resolves to false without prompting', async () => {
      const createInterface = vi.fn();
      vi.doMock('node:readline', () => ({ createInterface }));
      const { promptYesNo } = await import('../../../src/commands/everywhere/init.js');
      await expect(promptYesNo('Continue?')).resolves.toBe(false);
    });

    it('does not create a readline interface', async () => {
      const createInterface = vi.fn();
      vi.doMock('node:readline', () => ({ createInterface }));
      const { promptYesNo } = await import('../../../src/commands/everywhere/init.js');
      await promptYesNo('Continue?');
      expect(createInterface).not.toHaveBeenCalled();
    });
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

describe('writeTsConfigIfAbsent', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'we-init-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  describe('when tsconfig.json does not exist', () => {
    it('writes tsconfig.json to the directory', () => {
      writeTsConfigIfAbsent(tmpDir);
      expect(fs.existsSync(path.join(tmpDir, 'tsconfig.json'))).toBe(true);
    });

    it('writes valid JSON', () => {
      writeTsConfigIfAbsent(tmpDir);
      const content = fs.readFileSync(path.join(tmpDir, 'tsconfig.json'), 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('returns true', () => {
      expect(writeTsConfigIfAbsent(tmpDir)).toBe(true);
    });
  });

  describe('when tsconfig.json already exists', () => {
    beforeEach(() => {
      fs.writeFileSync(path.join(tmpDir, 'tsconfig.json'), '{"existing":true}\n');
    });

    it('does not overwrite the existing file', () => {
      writeTsConfigIfAbsent(tmpDir);
      const content = fs.readFileSync(path.join(tmpDir, 'tsconfig.json'), 'utf-8');
      expect(JSON.parse(content)).toEqual({ existing: true });
    });

    it('returns false', () => {
      expect(writeTsConfigIfAbsent(tmpDir)).toBe(false);
    });
  });
});

describe('writeAgentsMdIfAbsent', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'we-init-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  describe('when AGENTS.md does not exist', () => {
    it('writes AGENTS.md to the directory', () => {
      writeAgentsMdIfAbsent(tmpDir);
      expect(fs.existsSync(path.join(tmpDir, 'AGENTS.md'))).toBe(true);
    });

    it('writes non-empty content', () => {
      writeAgentsMdIfAbsent(tmpDir);
      const content = fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf-8');
      expect(content.length).toBeGreaterThan(0);
    });

    it('returns true', () => {
      expect(writeAgentsMdIfAbsent(tmpDir)).toBe(true);
    });
  });

  describe('when AGENTS.md already exists', () => {
    beforeEach(() => {
      fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), '# existing\n');
    });

    it('does not overwrite the existing file', () => {
      writeAgentsMdIfAbsent(tmpDir);
      const content = fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf-8');
      expect(content).toBe('# existing\n');
    });

    it('returns false', () => {
      expect(writeAgentsMdIfAbsent(tmpDir)).toBe(false);
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

      expect(mockSpawn).toHaveBeenCalledWith(expect.any(String), ['init'], expect.any(Object));
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

      const firstCall = mockSpawn.mock.calls[0];
      expect(firstCall).toBeDefined();
      const opts = firstCall?.[2] as { shell?: boolean };
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
