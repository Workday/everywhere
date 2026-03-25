import { describe, it, expect } from 'vitest';
import EverywhereBaseCommand from '../../../src/commands/everywhere/base';

describe('EverywhereBaseCommand', () => {
  describe('hidden', () => {
    it('is hidden from command listings', () => {
      expect(EverywhereBaseCommand.hidden).toBe(true);
    });
  });

  describe('baseFlags', () => {
    it('defines a plugin-dir flag', () => {
      expect(EverywhereBaseCommand.baseFlags['plugin-dir']).toBeDefined();
    });

    it('uses -D as the short char', () => {
      expect(EverywhereBaseCommand.baseFlags['plugin-dir'].char).toBe('D');
    });
  });
});
