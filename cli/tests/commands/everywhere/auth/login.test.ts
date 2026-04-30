import { describe, it, expect } from 'vitest';
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
});
