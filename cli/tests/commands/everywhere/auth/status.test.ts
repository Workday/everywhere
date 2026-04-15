import { describe, it, expect } from 'vitest';
import AuthStatusCommand from '../../../../src/commands/everywhere/auth/status.js';
import EverywhereBaseCommand from '../../../../src/commands/everywhere/base.js';

describe('everywhere auth status', () => {
  it('exists as a command class', () => {
    expect(AuthStatusCommand).toBeDefined();
  });

  describe('description', () => {
    it('describes showing authentication status', () => {
      expect(AuthStatusCommand.description).toBe('Show current authentication status.');
    });
  });

  describe('flags', () => {
    it('inherits the plugin-dir flag from the base command', () => {
      expect(AuthStatusCommand.flags['plugin-dir']).toBe(
        EverywhereBaseCommand.baseFlags['plugin-dir']
      );
    });
  });
});
