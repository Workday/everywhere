import { describe, it, expect } from 'vitest';

import { referenceIdToGraphTypePrefix } from '../../src/build/generate-graph-schema-query.js';

describe('referenceIdToGraphTypePrefix()', () => {
  describe('when the id contains underscores', () => {
    it('capitalizes the first segment and keeps the rest', () => {
      expect(referenceIdToGraphTypePrefix('workFromAlmostAnywhere_mcwslt')).toBe(
        'WorkFromAlmostAnywhere_mcwslt'
      );
    });
  });

  describe('when the id has no underscores', () => {
    it('capitalizes the sole segment', () => {
      expect(referenceIdToGraphTypePrefix('foo')).toBe('Foo');
    });
  });
});
