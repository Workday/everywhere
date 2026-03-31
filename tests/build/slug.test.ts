import { describe, it, expect } from 'vitest';
import { slugify } from '../../src/build/slug.js';

describe('slugify()', () => {
  it('lowercases the input', () => {
    expect(slugify('Hello')).toBe('hello');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('hello world')).toBe('hello-world');
  });

  it('removes non-alphanumeric characters', () => {
    expect(slugify('hello!@#world')).toBe('helloworld');
  });

  it('collapses consecutive hyphens', () => {
    expect(slugify('hello---world')).toBe('hello-world');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('-hello-world-')).toBe('hello-world');
  });

  it('handles mixed spaces and special characters', () => {
    expect(slugify('Hello World!')).toBe('hello-world');
  });

  it('handles scoped package names', () => {
    expect(slugify('@workday/hello')).toBe('workdayhello');
  });
});
