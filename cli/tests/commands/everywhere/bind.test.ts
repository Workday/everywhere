import { describe, it, expect } from 'vitest';
import BindCommand from '../../../src/commands/everywhere/bind';
import EverywhereBaseCommand from '../../../src/commands/everywhere/base';

describe('everywhere bind', () => {
  it('exists as a command class', () => {
    expect(BindCommand).toBeDefined();
  });

  describe('description', () => {
    it('describes generating data bindings', () => {
      expect(BindCommand.description).toBe(
        'Generate TypeScript types and data hooks from Workday Extend business object models.'
      );
    });
  });

  describe('flags', () => {
    it('inherits the plugin-dir flag from the base command', () => {
      expect(BindCommand.flags['plugin-dir']).toBe(EverywhereBaseCommand.baseFlags['plugin-dir']);
    });
  });

  describe('args', () => {
    it('accepts an optional app-source argument', () => {
      expect(BindCommand.args['app-source']).toBeDefined();
    });
  });
});
