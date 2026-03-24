import { describe, it, expect } from 'vitest';
import { plugin } from '../src/plugin.js';

describe('plugin()', () => {
  it('returns an object when called with required fields', () => {
    const result = plugin({ name: 'test-plugin', version: '1.0.0' });

    expect(result).toBeDefined();
  });

  describe('name', () => {
    it('returns the provided name', () => {
      const result = plugin({ name: 'my-plugin', version: '1.0.0' });

      expect(result.name).toBe('my-plugin');
    });
  });

  describe('version', () => {
    it('returns the provided version', () => {
      const result = plugin({ name: 'test-plugin', version: '2.5.0' });

      expect(result.version).toBe('2.5.0');
    });
  });

  describe('description', () => {
    it('returns the provided description', () => {
      const result = plugin({
        name: 'test-plugin',
        version: '1.0.0',
        description: 'A test plugin',
      });

      expect(result.description).toBe('A test plugin');
    });

    describe('when omitted', () => {
      it('returns undefined', () => {
        const result = plugin({ name: 'test-plugin', version: '1.0.0' });

        expect(result.description).toBeUndefined();
      });
    });
  });

  describe('returned object shape', () => {
    it('contains only declared properties', () => {
      const result = plugin({ name: 'test-plugin', version: '1.0.0' });

      expect(Object.keys(result)).toEqual(['name', 'version', 'description']);
    });
  });
});
