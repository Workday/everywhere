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

  it('maps MULTI_INSTANCE fields to string[]', () => {
    const result = generateModels([EMPLOYEE_SCHEMA]);

    expect(result).toContain('tasks: string[];');
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
