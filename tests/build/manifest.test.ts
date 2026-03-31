import { describe, it, expect } from 'vitest';
import { buildManifest } from '../../src/build/manifest.js';

describe('buildManifest()', () => {
  it('returns a manifest with name, version, and pages', () => {
    const result = buildManifest({
      name: 'test-plugin',
      version: '1.0.0',
      pages: [{ id: 'home', title: 'Home' }],
    });

    expect(result).toEqual({
      name: 'test-plugin',
      version: '1.0.0',
      pages: [{ id: 'home', title: 'Home' }],
    });
  });

  describe('description', () => {
    it('includes description when provided', () => {
      const result = buildManifest({
        name: 'test-plugin',
        version: '1.0.0',
        description: 'A test plugin.',
        pages: [],
      });

      expect(result.description).toBe('A test plugin.');
    });

    it('omits description when not provided', () => {
      const result = buildManifest({
        name: 'test-plugin',
        version: '1.0.0',
        pages: [],
      });

      expect(result).not.toHaveProperty('description');
    });
  });

  describe('pages', () => {
    it('returns an empty pages array when given no pages', () => {
      const result = buildManifest({
        name: 'test-plugin',
        version: '1.0.0',
        pages: [],
      });

      expect(result.pages).toEqual([]);
    });
  });
});
