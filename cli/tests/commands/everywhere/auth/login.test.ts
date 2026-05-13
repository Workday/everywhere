import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '@oclif/core/config';
import LoginCommand from '../../../../src/commands/everywhere/auth/login.js';
import EverywhereBaseCommand from '../../../../src/lib/command.js';

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

    it('has an https flag', () => {
      expect(LoginCommand.flags['https']).toBeDefined();
    });

    it('allows disabling https via --no-https', () => {
      expect(LoginCommand.flags['https']).toMatchObject({ allowNo: true });
    });

    it('inherits the plugin-dir flag from the base command', () => {
      expect(LoginCommand.flags['plugin-dir']).toBe(EverywhereBaseCommand.baseFlags['plugin-dir']);
    });
  });

  describe('promptForToken', () => {
    let cmd: LoginCommand;
    let fakeStdin: EventEmitter & { isTTY?: boolean; setRawMode: ReturnType<typeof vi.fn>; resume: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn> };
    let stderrWriteSpy: ReturnType<typeof vi.spyOn>;
    let originalStdin: typeof process.stdin;

    beforeEach(() => {
      cmd = new LoginCommand([], {} as Config);

      fakeStdin = Object.assign(new EventEmitter(), {
        isTTY: true as boolean | undefined,
        setRawMode: vi.fn(),
        resume: vi.fn(),
        pause: vi.fn(),
      });

      originalStdin = process.stdin;
      Object.defineProperty(process, 'stdin', { value: fakeStdin, writable: true });
      stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    });

    afterEach(() => {
      Object.defineProperty(process, 'stdin', { value: originalStdin, writable: true });
      vi.restoreAllMocks();
    });

    const promptForToken = () =>
      (cmd as unknown as { promptForToken(): Promise<string> }).promptForToken();

    it('enables raw mode when stdin is a TTY', () => {
      const promise = promptForToken();
      fakeStdin.emit('data', Buffer.from('tok\n'));

      return promise.then(() => {
        expect(fakeStdin.setRawMode).toHaveBeenCalledWith(true);
      });
    });

    it('does not enable raw mode when stdin is not a TTY', () => {
      fakeStdin.isTTY = undefined;
      const promise = promptForToken();
      fakeStdin.emit('data', Buffer.from('tok\n'));

      return promise.then(() => {
        expect(fakeStdin.setRawMode).not.toHaveBeenCalledWith(true);
      });
    });

    it('does not echo the typed token to stderr', () => {
      const promise = promptForToken();
      fakeStdin.emit('data', Buffer.from('secret-token\n'));

      return promise.then(() => {
        const written = stderrWriteSpy.mock.calls.map(([arg]) => arg).join('');
        expect(written).not.toContain('secret-token');
      });
    });

    it('resolves with the entered token on newline', () => {
      const promise = promptForToken();
      fakeStdin.emit('data', Buffer.from('my-token\n'));

      return expect(promise).resolves.toBe('my-token');
    });

    it('resolves with the entered token on carriage return', () => {
      const promise = promptForToken();
      fakeStdin.emit('data', Buffer.from('my-token\r'));

      return expect(promise).resolves.toBe('my-token');
    });

    it('trims whitespace from the token', () => {
      const promise = promptForToken();
      fakeStdin.emit('data', Buffer.from('  spaced-token  \n'));

      return expect(promise).resolves.toBe('spaced-token');
    });

    it('handles backspace by removing the last character', () => {
      const promise = promptForToken();
      fakeStdin.emit('data', Buffer.from('abc\x7Fd\n'));

      return expect(promise).resolves.toBe('abd');
    });

    it('restores raw mode and pauses stdin after input', () => {
      const promise = promptForToken();
      fakeStdin.emit('data', Buffer.from('tok\n'));

      return promise.then(() => {
        expect(fakeStdin.setRawMode).toHaveBeenCalledWith(false);
        expect(fakeStdin.pause).toHaveBeenCalled();
      });
    });

    it('exits the process on Ctrl+C', async () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      promptForToken();
      await vi.waitFor(() => expect(fakeStdin.resume).toHaveBeenCalled());

      fakeStdin.emit('data', Buffer.from('\u0003'));

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('exits the process on Ctrl+D', async () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      promptForToken();
      await vi.waitFor(() => expect(fakeStdin.resume).toHaveBeenCalled());

      fakeStdin.emit('data', Buffer.from('\u0004'));

      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
