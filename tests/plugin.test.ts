import { describe, it, expect } from 'vitest';
import { plugin } from '../src/plugin.js';

describe('plugin()', () => {
  it('returns an object when called with no arguments', () => {
    const result = plugin();

    expect(result).toBeDefined();
  });

  it('returns an object when called with an empty config', () => {
    const result = plugin({});

    expect(result).toBeDefined();
  });
});
