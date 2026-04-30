import { describe, it, expect } from 'vitest';
import InfoCommand from '../../../src/commands/everywhere/info';
import EverywhereBaseCommand from '../../../src/lib/command.js';

describe('everywhere info', () => {
  it('exists as a command class', () => {
    expect(InfoCommand).toBeDefined();
  });

  describe('description', () => {
    it('describes showing plugin details', () => {
      expect(InfoCommand.description).toBe('Show details for a Workday Everywhere plugin.');
    });
  });

  describe('flags', () => {
    it('inherits the plugin-dir flag from the base command', () => {
      expect(InfoCommand.flags['plugin-dir']).toBe(EverywhereBaseCommand.baseFlags['plugin-dir']);
    });
  });
});
