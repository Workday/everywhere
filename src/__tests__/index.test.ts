import { describe, it, expect } from 'vitest';
import * as sdk from '../index.ts';

describe('SDK entry point', () => {
  it('can be imported', () => {
    expect(sdk).toBeDefined();
  });
});
