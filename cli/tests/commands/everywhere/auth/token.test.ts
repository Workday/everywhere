import { describe, it, expect } from 'vitest';
import AuthTokenCommand from '../../../../src/commands/everywhere/auth/token.js';
import EverywhereBaseCommand from '../../../../src/lib/command.js';

describe('everywhere auth token', () => {
  it('exists as a command class', () => {
    expect(AuthTokenCommand).toBeDefined();
  });

  describe('description', () => {
    it('describes fetching an access token', () => {
      expect(AuthTokenCommand.description).toBe(
        'Fetch and display an access token from the gateway.'
      );
    });
  });

  describe('flags', () => {
    it('inherits the plugin-dir flag from the base command', () => {
      expect(AuthTokenCommand.flags['plugin-dir']).toBe(
        EverywhereBaseCommand.baseFlags['plugin-dir']
      );
    });

    it('defines a --json flag for full payload output', () => {
      expect(AuthTokenCommand.flags['json']).toBeDefined();
    });
  });
});
