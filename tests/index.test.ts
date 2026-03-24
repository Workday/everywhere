import { describe, it, expect } from 'vitest';
import * as sdk from '../src/index.js';

describe('SDK entry point', () => {
  it('can be imported', () => {
    expect(sdk).toBeDefined();
  });
});
