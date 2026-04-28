import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ShimModule = typeof import('../../src/build/index.js');

let warnSpy: ReturnType<typeof vi.spyOn>;
let shim: ShimModule;

beforeEach(async () => {
  vi.resetModules();
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  shim = await import('../../src/build/index.js');
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe('@workday/everywhere/build shim', () => {
  describe('slugify', () => {
    describe('when called with a mixed-case spaced input', () => {
      it('returns the kebab-cased slug matching the canonical implementation', () => {
        expect(shim.slugify('My Awesome Plugin!')).toBe('my-awesome-plugin');
      });
    });
  });

  describe('deprecation warning', () => {
    describe('when slugify is called for the first time', () => {
      it('writes a deprecation warning to the console', () => {
        shim.slugify('anything');

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('deprecated'));
      });
    });

    describe('when slugify is called repeatedly', () => {
      it('writes the deprecation warning only once', () => {
        shim.slugify('first');
        shim.slugify('second');
        shim.slugify('third');

        expect(warnSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('when multiple deprecated exports are called in sequence', () => {
      it('writes the deprecation warning only once across them', async () => {
        shim.slugify('first');
        await shim.bundlePlugin('/nonexistent-plugin-dir-for-test').catch(() => {
          // The proxy is expected to fail loading or executing; we only care
          // that warnDeprecated was triggered exactly once across the calls.
        });

        expect(warnSpy).toHaveBeenCalledTimes(1);
      });
    });
  });
});
