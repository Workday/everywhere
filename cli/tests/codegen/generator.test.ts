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

const EMPLOYEE_SCHEMA_WITH_GRAPH: ModelSchema = {
  name: 'Employee',
  label: 'Employee',
  collection: 'employees',
  fields: [{ name: 'title', type: 'TEXT' }],
  graph: {
    dataSourceKey: 'myApp_ns1_employees',
    createInputType: 'MyApp_ns1_EmployeesSummary_Create_Input',
    updateInputType: 'MyApp_ns1_EmployeesSummary_Update_Input',
  },
};

const EMPLOYEE_SCHEMA_WITH_NULLABLE_FIELDS: ModelSchema = {
  name: 'Employee',
  label: 'Employee',
  collection: 'employees',
  fields: [
    { name: 'name', type: 'TEXT' },
    { name: 'email', type: 'TEXT' },
    { name: 'displayName', type: 'TEXT', isDerived: true },
  ],
  graph: {
    dataSourceKey: 'myApp_ns1_employees',
    createInputType: 'MyApp_ns1_EmployeesSummary_Create_Input',
    updateInputType: 'MyApp_ns1_EmployeesSummary_Update_Input',
    fields: {
      name: { nullable: false },
      email: { nullable: true },
      displayName: { nullable: true },
    },
    createInputFields: {
      name: { required: true },
      email: { required: false },
    },
    updateInputFields: {
      name: { required: false },
      email: { required: false },
    },
  },
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

  it('marks the proratedAmount derived field as readonly', () => {
    const result = generateModels([WORK_EVENT_SCHEMA]);

    expect(result).toContain('readonly proratedAmount: number;');
  });

  it('marks the isWorkdayEvent derived field as readonly', () => {
    const result = generateModels([WORK_EVENT_SCHEMA]);

    expect(result).toContain('readonly isWorkdayEvent: boolean;');
  });

  it('does not mark the name regular field as readonly', () => {
    const result = generateModels([WORK_EVENT_SCHEMA]);

    expect(result).not.toContain('readonly name:');
  });

  it('does not mark the cost regular field as readonly', () => {
    const result = generateModels([WORK_EVENT_SCHEMA]);

    expect(result).not.toContain('readonly cost:');
  });

  describe('when the schema has graph field metadata', () => {
    describe('nullable fields', () => {
      it('emits T | null for a nullable field', () => {
        const result = generateModels([EMPLOYEE_SCHEMA_WITH_NULLABLE_FIELDS]);

        expect(result).toContain('email: string | null;');
      });

      it('emits T for a non-null field', () => {
        const result = generateModels([EMPLOYEE_SCHEMA_WITH_NULLABLE_FIELDS]);

        expect(result).toContain('name: string;');
      });

      it('emits T | null for a nullable derived field', () => {
        const result = generateModels([EMPLOYEE_SCHEMA_WITH_NULLABLE_FIELDS]);

        expect(result).toContain('readonly displayName: string | null;');
      });
    });

    describe('without graph field metadata', () => {
      it('emits T for all fields (unchanged fallback)', () => {
        const result = generateModels([EMPLOYEE_SCHEMA]);

        expect(result).toContain('title: string;');
      });
    });

    describe('CreateXxxInput', () => {
      it('emits CreateEmployeeInput after the interface when createInputFields is present', () => {
        const result = generateModels([EMPLOYEE_SCHEMA_WITH_NULLABLE_FIELDS]);

        expect(result).toContain('export interface CreateEmployeeInput {');
      });

      it('emits required fields without ? in CreateEmployeeInput', () => {
        const result = generateModels([EMPLOYEE_SCHEMA_WITH_NULLABLE_FIELDS]);

        expect(result).toContain('  name: string;');
      });

      it('emits optional fields with ? in CreateEmployeeInput', () => {
        const result = generateModels([EMPLOYEE_SCHEMA_WITH_NULLABLE_FIELDS]);

        expect(result).toContain('  email?: string;');
      });

      it('excludes derived fields from CreateEmployeeInput', () => {
        const result = generateModels([EMPLOYEE_SCHEMA_WITH_NULLABLE_FIELDS]);

        const createInputStart = result.indexOf('export interface CreateEmployeeInput');
        const createInputEnd = result.indexOf('}', createInputStart);
        const createInputBlock = result.slice(createInputStart, createInputEnd);
        expect(createInputBlock).not.toContain('displayName');
      });

      it('does not emit CreateEmployeeInput when createInputFields is absent', () => {
        const result = generateModels([EMPLOYEE_SCHEMA]);

        expect(result).not.toContain('CreateEmployeeInput');
      });
    });

    describe('UpdateXxxInput', () => {
      it('emits UpdateEmployeeInput after the interface when updateInputFields is present', () => {
        const result = generateModels([EMPLOYEE_SCHEMA_WITH_NULLABLE_FIELDS]);

        expect(result).toContain('export interface UpdateEmployeeInput {');
      });

      it('emits all fields as optional in UpdateEmployeeInput', () => {
        const result = generateModels([EMPLOYEE_SCHEMA_WITH_NULLABLE_FIELDS]);

        const updateInputStart = result.indexOf('export interface UpdateEmployeeInput');
        const updateInputEnd = result.indexOf('}', updateInputStart);
        const updateInputBlock = result.slice(updateInputStart, updateInputEnd);
        expect(updateInputBlock).toContain('name?: string;');
      });

      it('emits email as optional in UpdateEmployeeInput', () => {
        const result = generateModels([EMPLOYEE_SCHEMA_WITH_NULLABLE_FIELDS]);

        const updateInputStart = result.indexOf('export interface UpdateEmployeeInput');
        const updateInputEnd = result.indexOf('}', updateInputStart);
        const updateInputBlock = result.slice(updateInputStart, updateInputEnd);
        expect(updateInputBlock).toContain('email?: string;');
      });

      it('excludes derived fields from UpdateEmployeeInput', () => {
        const result = generateModels([EMPLOYEE_SCHEMA_WITH_NULLABLE_FIELDS]);

        const updateInputStart = result.indexOf('export interface UpdateEmployeeInput');
        const updateInputEnd = result.indexOf('}', updateInputStart);
        const updateInputBlock = result.slice(updateInputStart, updateInputEnd);
        expect(updateInputBlock).not.toContain('displayName');
      });

      it('does not emit UpdateEmployeeInput when updateInputFields is absent', () => {
        const result = generateModels([EMPLOYEE_SCHEMA]);

        expect(result).not.toContain('UpdateEmployeeInput');
      });
    });
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

  describe('when the schema has graph metadata', () => {
    it('emits the dataSourceKey in the graph block', () => {
      const result = generateSchema([EMPLOYEE_SCHEMA_WITH_GRAPH]);

      expect(result).toContain("dataSourceKey: 'myApp_ns1_employees'");
    });

    it('emits the createInputType in the graph block', () => {
      const result = generateSchema([EMPLOYEE_SCHEMA_WITH_GRAPH]);

      expect(result).toContain("createInputType: 'MyApp_ns1_EmployeesSummary_Create_Input'");
    });

    it('emits the updateInputType in the graph block', () => {
      const result = generateSchema([EMPLOYEE_SCHEMA_WITH_GRAPH]);

      expect(result).toContain("updateInputType: 'MyApp_ns1_EmployeesSummary_Update_Input'");
    });
  });

  describe('when the schema has no graph metadata', () => {
    it('does not emit a graph key', () => {
      const result = generateSchema([EMPLOYEE_SCHEMA]);

      expect(result).not.toContain('graph:');
    });
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
