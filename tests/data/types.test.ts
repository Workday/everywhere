import { describe, it, expect } from 'vitest';
import type { FieldType, FieldSchema, ModelSchema } from '../../src/data/types.js';

describe('data schema types', () => {
  describe('FieldType', () => {
    it('accepts TEXT as a valid field type', () => {
      const fieldType: FieldType = 'TEXT';

      expect(fieldType).toBe('TEXT');
    });

    it('accepts DATE as a valid field type', () => {
      const fieldType: FieldType = 'DATE';

      expect(fieldType).toBe('DATE');
    });

    it('accepts BOOLEAN as a valid field type', () => {
      const fieldType: FieldType = 'BOOLEAN';

      expect(fieldType).toBe('BOOLEAN');
    });

    it('accepts SINGLE_INSTANCE as a valid field type', () => {
      const fieldType: FieldType = 'SINGLE_INSTANCE';

      expect(fieldType).toBe('SINGLE_INSTANCE');
    });

    it('accepts MULTI_INSTANCE as a valid field type', () => {
      const fieldType: FieldType = 'MULTI_INSTANCE';

      expect(fieldType).toBe('MULTI_INSTANCE');
    });
  });

  describe('FieldSchema', () => {
    it('requires name and type', () => {
      const field: FieldSchema = { name: 'location', type: 'TEXT' };

      expect(field.name).toBe('location');
    });

    it('allows optional target for reference types', () => {
      const field: FieldSchema = {
        name: 'createdBy',
        type: 'SINGLE_INSTANCE',
        target: 'WORKER',
      };

      expect(field.target).toBe('WORKER');
    });

    it('allows optional precision for date types', () => {
      const field: FieldSchema = {
        name: 'startDate',
        type: 'DATE',
        precision: 'DAY',
      };

      expect(field.precision).toBe('DAY');
    });
  });

  describe('ModelSchema', () => {
    it('requires name, label, collection, and fields', () => {
      const schema: ModelSchema = {
        name: 'Employee',
        label: 'Employee',
        collection: 'employees',
        fields: [{ name: 'title', type: 'TEXT' }],
      };

      expect(schema.name).toBe('Employee');
    });

    it('uses collection name from defaultCollection', () => {
      const schema: ModelSchema = {
        name: 'WorkFromAnywhereRequest',
        label: 'Work From Anywhere Request',
        collection: 'workFromAnywhereRequests',
        fields: [],
      };

      expect(schema.collection).toBe('workFromAnywhereRequests');
    });
  });
});
