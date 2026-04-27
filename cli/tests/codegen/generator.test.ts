import { describe, it, expect } from 'vitest';
import type { ModelSchema } from '../../../src/data/types.js';
import {
  generateModels,
  generateSchema,
  generateModelHooks,
  generateIndex,
} from '../../src/codegen/generator';

const EMPLOYEE_SCHEMA: ModelSchema = {
  name: 'Employee',
  label: 'Employee',
  collection: 'employees',
  fields: [
    { name: 'title', type: 'TEXT' },
    { name: 'startDate', type: 'DATE', precision: 'DAY' },
    { name: 'isActive', type: 'BOOLEAN' },
    { name: 'department', type: 'SINGLE_INSTANCE', target: 'Department' },
    { name: 'tasks', type: 'MULTI_INSTANCE', target: 'Task' },
  ],
};

const DEPARTMENT_SCHEMA: ModelSchema = {
  name: 'Department',
  label: 'Department',
  collection: 'departments',
  fields: [{ name: 'name', type: 'TEXT' }],
};

const WORK_EVENT_SCHEMA: ModelSchema = {
  name: 'WorkEvent',
  label: 'Work Event',
  collection: 'workEvents',
  securityDomains: ['ManageCreateAnEvent', 'RegisterForEvents'],
  fields: [
    { name: 'name', type: 'TEXT' },
    { name: 'cost', type: 'CURRENCY' },
    { name: 'internalOnly', type: 'BOOLEAN' },
    { name: 'proratedAmount', type: 'DECIMAL', isDerived: true },
    { name: 'isWorkdayEvent', type: 'BOOLEAN', isDerived: true },
  ],
};

const REGISTRANT_SCHEMA: ModelSchema = {
  name: 'Registrant',
  label: 'Registrant',
  collection: 'registrants',
  fields: [{ name: 'name', type: 'TEXT' }],
};

const WORK_EVENT_WITH_REGISTRANTS_SCHEMA: ModelSchema = {
  name: 'WorkEvent',
  label: 'Work Event',
  collection: 'workEvents',
  fields: [
    { name: 'name', type: 'TEXT' },
    { name: 'registrants', type: 'MULTI_INSTANCE', target: 'Registrant' },
  ],
};

describe('generateModels()', () => {
  it('starts with the auto-generated comment', () => {
    const result = generateModels([EMPLOYEE_SCHEMA]);

    expect(result).toMatch(/^\/\/ AUTO-GENERATED/);
  });

  it('generates an interface for each model', () => {
    const result = generateModels([EMPLOYEE_SCHEMA, DEPARTMENT_SCHEMA]);

    expect(result).toContain('export interface Employee {');
  });

  it('includes a synthetic id field', () => {
    const result = generateModels([EMPLOYEE_SCHEMA]);

    expect(result).toContain('id: string;');
  });

  it('maps TEXT fields to string', () => {
    const result = generateModels([EMPLOYEE_SCHEMA]);

    expect(result).toContain('title: string;');
  });

  it('maps DATE fields to string', () => {
    const result = generateModels([EMPLOYEE_SCHEMA]);

    expect(result).toContain('startDate: string;');
  });

  it('maps BOOLEAN fields to boolean', () => {
    const result = generateModels([EMPLOYEE_SCHEMA]);

    expect(result).toContain('isActive: boolean;');
  });

  it('maps SINGLE_INSTANCE fields to string', () => {
    const result = generateModels([EMPLOYEE_SCHEMA]);

    expect(result).toContain('department: string;');
  });

  it('maps MULTI_INSTANCE fields to string[] when target is not in the same app', () => {
    const result = generateModels([EMPLOYEE_SCHEMA]);

    expect(result).toContain('tasks: string[];');
  });

  it('maps MULTI_INSTANCE fields to typed array when target is a known model in the same app', () => {
    const result = generateModels([WORK_EVENT_WITH_REGISTRANTS_SCHEMA, REGISTRANT_SCHEMA]);

    expect(result).toContain('registrants: Registrant[];');
  });

  it('maps CURRENCY fields to CurrencyValue', () => {
    const result = generateModels([WORK_EVENT_SCHEMA]);

    expect(result).toContain('cost: CurrencyValue;');
  });

  it('imports CurrencyValue when any field uses CURRENCY', () => {
    const result = generateModels([WORK_EVENT_SCHEMA]);

    expect(result).toContain("import type { CurrencyValue } from '@workday/everywhere';");
  });

  it('does not import CurrencyValue when no CURRENCY fields exist', () => {
    const result = generateModels([EMPLOYEE_SCHEMA]);

    expect(result).not.toContain('CurrencyValue');
  });

  it('maps DECIMAL fields to number', () => {
    const result = generateModels([WORK_EVENT_SCHEMA]);

    expect(result).toContain('proratedAmount: number;');
  });

  it('marks derived fields as readonly', () => {
    const result = generateModels([WORK_EVENT_SCHEMA]);

    expect(result).toContain('readonly proratedAmount: number;');
    expect(result).toContain('readonly isWorkdayEvent: boolean;');
  });

  it('does not mark regular fields as readonly', () => {
    const result = generateModels([WORK_EVENT_SCHEMA]);

    expect(result).not.toContain('readonly name:');
    expect(result).not.toContain('readonly cost:');
  });
});

describe('generateSchema()', () => {
  it('starts with the auto-generated comment', () => {
    const result = generateSchema([EMPLOYEE_SCHEMA]);

    expect(result).toMatch(/^\/\/ AUTO-GENERATED/);
  });

  it('imports ModelSchema from the SDK', () => {
    const result = generateSchema([EMPLOYEE_SCHEMA]);

    expect(result).toContain("import type { ModelSchema } from '@workday/everywhere';");
  });

  it('exports a schemas record', () => {
    const result = generateSchema([EMPLOYEE_SCHEMA]);

    expect(result).toContain('export const schemas: Record<string, ModelSchema>');
  });

  it('includes the model name as a key', () => {
    const result = generateSchema([EMPLOYEE_SCHEMA]);

    expect(result).toContain('Employee: {');
  });

  it('includes securityDomains in the schema', () => {
    const result = generateSchema([WORK_EVENT_SCHEMA]);

    expect(result).toContain('securityDomains: ["ManageCreateAnEvent","RegisterForEvents"]');
  });

  it('emits empty securityDomains array when none are defined', () => {
    const result = generateSchema([EMPLOYEE_SCHEMA]);

    expect(result).toContain('securityDomains: []');
  });

  it('marks derived fields with isDerived: true in schema', () => {
    const result = generateSchema([WORK_EVENT_SCHEMA]);

    expect(result).toContain('isDerived: true');
  });
});

describe('generateModelHooks()', () => {
  it('starts with the auto-generated comment', () => {
    const result = generateModelHooks(EMPLOYEE_SCHEMA);

    expect(result).toMatch(/^\/\/ AUTO-GENERATED/);
  });

  it('imports useQuery and useMutation from the SDK', () => {
    const result = generateModelHooks(EMPLOYEE_SCHEMA);

    expect(result).toContain("import { useQuery, useMutation } from '@workday/everywhere';");
  });

  it('imports the model type from models', () => {
    const result = generateModelHooks(EMPLOYEE_SCHEMA);

    expect(result).toContain("import type { Employee } from './models.js';");
  });

  it('generates a plural query hook', () => {
    const result = generateModelHooks(EMPLOYEE_SCHEMA);

    expect(result).toContain('export function useEmployees(');
  });

  it('generates a singular query hook', () => {
    const result = generateModelHooks(EMPLOYEE_SCHEMA);

    expect(result).toContain('export function useEmployee(id: string)');
  });

  it('generates a mutation hook', () => {
    const result = generateModelHooks(EMPLOYEE_SCHEMA);

    expect(result).toContain('export function useEmployeeMutation()');
  });
});

describe('generateIndex()', () => {
  it('starts with the auto-generated comment', () => {
    const result = generateIndex([EMPLOYEE_SCHEMA]);

    expect(result).toMatch(/^\/\/ AUTO-GENERATED/);
  });

  it('re-exports from models', () => {
    const result = generateIndex([EMPLOYEE_SCHEMA]);

    expect(result).toContain("export * from './models.js';");
  });

  it('re-exports from schema', () => {
    const result = generateIndex([EMPLOYEE_SCHEMA]);

    expect(result).toContain("export * from './schema.js';");
  });

  it('re-exports from each model hook file', () => {
    const result = generateIndex([EMPLOYEE_SCHEMA, DEPARTMENT_SCHEMA]);

    expect(result).toContain("export * from './Employee.js';");
  });
});
