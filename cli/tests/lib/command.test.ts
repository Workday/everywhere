import { describe, it, expect, vi, beforeEach } from 'vitest';
import EverywhereBaseCommand from '../../src/lib/command.js';

class TestCommand extends EverywhereBaseCommand {
  async run(): Promise<void> {}

  setVerbose(value: boolean): void {
    (this as any)._verbose = value;
  }
}

describe('EverywhereBaseCommand', () => {
  describe('baseFlags', () => {
    it('defines a plugin-dir flag', () => {
      expect(EverywhereBaseCommand.baseFlags['plugin-dir']).toBeDefined();
    });

    it('uses -D as the short char', () => {
      expect(EverywhereBaseCommand.baseFlags['plugin-dir'].char).toBe('D');
    });

    it('defines a verbose flag', () => {
      expect(EverywhereBaseCommand.baseFlags['verbose']).toBeDefined();
    });

    it('uses -v as the short char for verbose', () => {
      expect(EverywhereBaseCommand.baseFlags['verbose'].char).toBe('v');
    });
  });

  describe('isVerbose', () => {
    describe('when verbose has not been set', () => {
      it('returns false', () => {
        const cmd = new TestCommand([], {} as any);
        expect((cmd as any).isVerbose).toBe(false);
      });
    });

    describe('when verbose has been set', () => {
      it('returns true', () => {
        const cmd = new TestCommand([], {} as any);
        cmd.setVerbose(true);
        expect((cmd as any).isVerbose).toBe(true);
      });
    });
  });

  describe('catch()', () => {
    let cmd: TestCommand;
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      cmd = new TestCommand([], {} as any);
      warnSpy = vi.spyOn(cmd, 'warn').mockImplementation(() => {});
    });

    describe('when verbose is not set', () => {
      it('does not output the stack trace', async () => {
        const error = new Error('oops');
        error.stack = 'Error: oops\n    at src/build.ts:42:5';
        try {
          await cmd.catch(error);
        } catch {
          /* oclif re-throws */
        }
        expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('at src/build.ts'));
      });

      it('does not output a timestamp', async () => {
        const error = new Error('oops');
        try {
          await cmd.catch(error);
        } catch {
          /* oclif re-throws */
        }
        expect(warnSpy).not.toHaveBeenCalledWith(expect.stringMatching(/\d{4}-\d{2}-\d{2}T/));
      });
    });

    describe('when verbose is set', () => {
      beforeEach(() => {
        cmd.setVerbose(true);
      });

      it('outputs the stack trace', async () => {
        const error = new Error('oops');
        error.stack = 'Error: oops\n    at src/build.ts:42:5';
        try {
          await cmd.catch(error);
        } catch {
          /* oclif re-throws */
        }
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('at src/build.ts'));
      });

      it('outputs a timestamp', async () => {
        const error = new Error('oops');
        try {
          await cmd.catch(error);
        } catch {
          /* oclif re-throws */
        }
        expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/\d{4}-\d{2}-\d{2}T/));
      });

      it('outputs the error code when present', async () => {
        const error = Object.assign(new Error('oops'), { code: 'ENOENT' });
        try {
          await cmd.catch(error);
        } catch {
          /* oclif re-throws */
        }
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('ENOENT'));
      });

      it('does not output the error cause', async () => {
        const cause = { token: 'eyJ0b2tlbg.secret.sig' };
        const error = Object.assign(new Error('Request failed'), { cause });
        try {
          await cmd.catch(error);
        } catch {
          /* oclif re-throws */
        }
        const allWarnArgs = warnSpy.mock.calls.flat().join('');
        expect(allWarnArgs).not.toContain('eyJ0b2tlbg');
      });
    });
  });
});
