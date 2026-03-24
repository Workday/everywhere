import { describe, it, expect, vi } from 'vitest';
import { info } from '../../src/cli/info.js';

describe('info()', () => {
  it('is a function', () => {
    expect(typeof info).toBe('function');
  });

  describe('plugin directory', () => {
    it('prints the plugin directory', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

      info({ pluginDir: '/some/path' });

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('/some/path'),
      );

      spy.mockRestore();
    });
  });
});
