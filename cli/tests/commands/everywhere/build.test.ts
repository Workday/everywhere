import { describe, it, expect } from 'vitest';
import BuildCommand from '../../../src/commands/everywhere/build';
import EverywhereBaseCommand from '../../../src/lib/command.js';

describe('everywhere build', () => {
  it('exists as a command class', () => {
    expect(BuildCommand).toBeDefined();
  });

  describe('description', () => {
    it('describes building a plugin bundle', () => {
      expect(BuildCommand.description).toBe('Build a plugin bundle.');
    });
  });

  describe('flags', () => {
    it('inherits the plugin-dir flag from the base command', () => {
      expect(BuildCommand.flags['plugin-dir']).toBe(EverywhereBaseCommand.baseFlags['plugin-dir']);
    });
  });
});
