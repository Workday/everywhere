import { describe, it, expect } from 'vitest';
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
