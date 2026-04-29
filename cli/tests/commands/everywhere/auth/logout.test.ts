import { describe, it, expect } from 'vitest';
import LogoutCommand from '../../../../src/commands/everywhere/auth/logout.js';
import EverywhereBaseCommand from '../../../../src/lib/command.js';

describe('everywhere auth logout', () => {
  it('exists as a command class', () => {
    expect(LogoutCommand).toBeDefined();
  });

  describe('description', () => {
    it('describes logging out', () => {
      expect(LogoutCommand.description).toBe('Log out and clear stored authentication token.');
    });
  });

  describe('flags', () => {
    it('inherits the plugin-dir flag from the base command', () => {
      expect(LogoutCommand.flags['plugin-dir']).toBe(EverywhereBaseCommand.baseFlags['plugin-dir']);
    });
  });
});
