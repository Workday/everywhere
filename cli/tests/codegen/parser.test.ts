import { describe, it, expect } from 'vitest';
import { parseBusinessObject } from '../../src/codegen/parser';

const SIMPLE_OBJECT = {
  id: 1,
  name: 'DemoObj',
  label: 'Demo Obj',
  defaultCollection: { name: 'demoObjs', label: 'Demo Objs' },
  fields: [{ id: 1, name: 'myField1', type: 'TEXT' }],
};

const COMPLEX_OBJECT = {
  id: 2,
  name: 'WorkFromAnywhereRequest',
  label: 'Work From Anywhere Request',
  defaultCollection: {
    name: 'workFromAnywhereRequests',
    label: 'Work From Anywhere Request',
  },
  defaultSecurityDomains: ['ManageWorkFromAnywhere', 'ViewWorkFromAnywhere'],
  fields: [
    { id: 1, name: 'location', type: 'TEXT' },
    { id: 2, name: 'startDate', type: 'DATE', precision: 'DAY' },
    { id: 3, name: 'rightToWork', type: 'BOOLEAN' },
    { id: 4, name: 'createdBy', type: 'SINGLE_INSTANCE', target: 'WORKER' },
    {
      id: 5,
      name: 'rightToWorkVerification',
      type: 'MULTI_INSTANCE',
      target: 'RightToWorkVerification',
    },
  ],
  derivedFields: [
    { id: 1, name: 'displayName', type: 'TEXT' },
    { id: 2, name: 'totalDays', type: 'DECIMAL' },
  ],
};

describe('parseBusinessObject()', () => {
  it('returns a ModelSchema from a business object definition', () => {
    const result = parseBusinessObject(SIMPLE_OBJECT);

    expect(result).toBeDefined();
  });

  describe('name', () => {
    it('uses the business object name', () => {
      const result = parseBusinessObject(SIMPLE_OBJECT);

      expect(result.name).toBe('DemoObj');
    });
  });

  describe('label', () => {
    it('uses the business object label', () => {
      const result = parseBusinessObject(SIMPLE_OBJECT);

      expect(result.label).toBe('Demo Obj');
    });
  });

  describe('collection', () => {
    it('uses the defaultCollection name', () => {
      const result = parseBusinessObject(SIMPLE_OBJECT);

      expect(result.collection).toBe('demoObjs');
    });
  });

  describe('securityDomains', () => {
    it('defaults to empty array when not present', () => {
      const result = parseBusinessObject(SIMPLE_OBJECT);

      expect(result.securityDomains).toEqual([]);
    });

    it('includes domains from defaultSecurityDomains', () => {
      const result = parseBusinessObject(COMPLEX_OBJECT);

      expect(result.securityDomains).toEqual(['ManageWorkFromAnywhere', 'ViewWorkFromAnywhere']);
    });
  });

  describe('fields', () => {
    it('maps TEXT fields', () => {
      const result = parseBusinessObject(SIMPLE_OBJECT);

      expect(result.fields[0]).toEqual({ name: 'myField1', type: 'TEXT' });
    });

    it('maps DATE fields with precision', () => {
      const result = parseBusinessObject(COMPLEX_OBJECT);
      const dateField = result.fields.find((f) => f.name === 'startDate');

      expect(dateField).toEqual({ name: 'startDate', type: 'DATE', precision: 'DAY' });
    });

    it('maps BOOLEAN fields', () => {
      const result = parseBusinessObject(COMPLEX_OBJECT);
      const boolField = result.fields.find((f) => f.name === 'rightToWork');

      expect(boolField).toEqual({ name: 'rightToWork', type: 'BOOLEAN' });
    });

    it('maps SINGLE_INSTANCE fields with target', () => {
      const result = parseBusinessObject(COMPLEX_OBJECT);
      const refField = result.fields.find((f) => f.name === 'createdBy');

      expect(refField).toEqual({
        name: 'createdBy',
        type: 'SINGLE_INSTANCE',
        target: 'WORKER',
      });
    });

    it('maps MULTI_INSTANCE fields with target', () => {
      const result = parseBusinessObject(COMPLEX_OBJECT);
      const multiField = result.fields.find((f) => f.name === 'rightToWorkVerification');

      expect(multiField).toEqual({
        name: 'rightToWorkVerification',
        type: 'MULTI_INSTANCE',
        target: 'RightToWorkVerification',
      });
    });
  });

  describe('derivedFields', () => {
    it('appends derived fields after regular fields', () => {
      const result = parseBusinessObject(COMPLEX_OBJECT);
      const regularNames = COMPLEX_OBJECT.fields.map((f) => f.name);
      const derivedNames = COMPLEX_OBJECT.derivedFields.map((f) => f.name);

      const allNames = result.fields.map((f) => f.name);
      expect(allNames).toEqual([...regularNames, ...derivedNames]);
    });

    it('marks derived fields with isDerived: true', () => {
      const result = parseBusinessObject(COMPLEX_OBJECT);
      const derivedField = result.fields.find((f) => f.name === 'displayName');

      expect(derivedField?.isDerived).toBe(true);
    });

    it('does not mark regular fields as derived', () => {
      const result = parseBusinessObject(COMPLEX_OBJECT);
      const regularField = result.fields.find((f) => f.name === 'location');

      expect(regularField?.isDerived).toBeUndefined();
    });

    it('defaults to no derived fields when derivedFields is absent', () => {
      const result = parseBusinessObject(SIMPLE_OBJECT);
      const hasDerived = result.fields.some((f) => f.isDerived);

      expect(hasDerived).toBe(false);
    });
  });
});
