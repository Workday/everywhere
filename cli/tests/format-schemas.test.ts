import { describe, it, expect } from 'vitest';
import { formatSchemas } from '../src/format-schemas.js';

describe('formatSchemas', () => {
  describe('when the schema list is empty', () => {
    it('returns an empty string', () => {
      expect(formatSchemas([])).toBe('');
    });
  });

  describe('when the schema has one model with one field', () => {
    it('returns the headline and one field line', () => {
      const result = formatSchemas([
        {
          name: 'Foo',
          label: 'Foo Label',
          collection: 'foos',
          fields: [{ name: 'id', type: 'string' }],
        },
      ]);

      expect(result).toBe('Foo — "Foo Label" (collection: foos, 1 field)\n  id  string');
    });
  });

  describe('when a model has fields with different name lengths', () => {
    it('pads field names to the longest name within that model', () => {
      const result = formatSchemas([
        {
          name: 'Foo',
          label: 'Foo',
          collection: 'foos',
          fields: [
            { name: 'id', type: 'string' },
            { name: 'longerName', type: 'number' },
          ],
        },
      ]);

      const lines = result.split('\n');
      expect(lines[1]).toBe('  id          string');
    });
  });

  describe('when a field has a target (reference)', () => {
    it('appends an arrow and the target name', () => {
      const result = formatSchemas([
        {
          name: 'Foo',
          label: 'Foo',
          collection: 'foos',
          fields: [{ name: 'owner', type: 'reference', target: 'Worker' }],
        },
      ]);

      expect(result).toContain('reference → Worker');
    });
  });

  describe('when a field has precision', () => {
    it('appends the precision in parentheses', () => {
      const result = formatSchemas([
        {
          name: 'Foo',
          label: 'Foo',
          collection: 'foos',
          fields: [{ name: 'startDate', type: 'date', precision: 'day' }],
        },
      ]);

      expect(result).toContain('date (precision: day)');
    });
  });

  describe('when a field has both target and precision', () => {
    it('includes both in the type string', () => {
      const result = formatSchemas([
        {
          name: 'Foo',
          label: 'Foo',
          collection: 'foos',
          fields: [{ name: 'field', type: 'reference', target: 'X', precision: 'y' }],
        },
      ]);

      expect(result).toContain('reference → X (precision: y)');
    });
  });

  describe('when there are multiple models', () => {
    it('separates model blocks with a blank line', () => {
      const result = formatSchemas([
        {
          name: 'Foo',
          label: 'Foo',
          collection: 'foos',
          fields: [{ name: 'id', type: 'string' }],
        },
        {
          name: 'Bar',
          label: 'Bar',
          collection: 'bars',
          fields: [{ name: 'id', type: 'string' }],
        },
      ]);

      expect(result).toContain('string\n\nBar');
    });
  });

  describe('when two models have different longest field names', () => {
    it('pads each model independently', () => {
      const result = formatSchemas([
        {
          name: 'Short',
          label: 'Short',
          collection: 'shorts',
          fields: [{ name: 'id', type: 'string' }],
        },
        {
          name: 'Long',
          label: 'Long',
          collection: 'longs',
          fields: [
            { name: 'id', type: 'string' },
            { name: 'veryLongField', type: 'string' },
          ],
        },
      ]);

      const lines = result.split('\n');
      // First model's id is padded to 2 chars (its max)
      expect(lines[1]).toBe('  id  string');
    });
  });

  describe('when a model has no fields', () => {
    it('returns just the headline', () => {
      const result = formatSchemas([
        {
          name: 'Empty',
          label: 'Empty',
          collection: 'empties',
          fields: [],
        },
      ]);

      expect(result).toBe('Empty — "Empty" (collection: empties, 0 fields)');
    });
  });
});
