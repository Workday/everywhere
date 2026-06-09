import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { introspectGraphTypes, applyIntrospectionOutcome } from '../../src/codegen/introspect';
import type { ModelSchema, GraphMetadata } from '../../../src/data/types.js';

vi.mock('../../src/config.js', () => ({
  appConfig: vi.fn(),
}));

import { appConfig } from '../../src/config.js';

vi.mock('../../src/gateway/client.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/gateway/client.js')>(
    '../../src/gateway/client.js'
  );
  return {
    ...actual,
    GatewayClient: vi.fn(),
  };
});

import { GatewayClient, GatewayRequestError } from '../../src/gateway/client.js';

const BASE_SCHEMA: ModelSchema = {
  name: 'Employee',
  label: 'Employee',
  collection: 'employees',
  fields: [],
};

const GRAPH_META: GraphMetadata = {
  dataSourceKey: 'myApp_ns1_employees',
  createInputType: 'MyApp_ns1_EmployeesSummary_Create_Input',
  updateInputType: 'MyApp_ns1_EmployeesSummary_Update_Input',
};

describe('introspectGraphTypes()', () => {
  let tmpDir: string;
  let requestMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'we-introspect-'));
    vi.mocked(appConfig).mockReturnValue({
      read: () => ({
        auth: { gateway: 'https://api.workday.com', token: 'test-token' },
      }),
      write: () => {},
      path: '/fake/config',
    });
    requestMock = vi.fn();
    vi.mocked(GatewayClient).mockImplementation(function (this: unknown) {
      return { request: requestMock } as unknown as InstanceType<typeof GatewayClient>;
    });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function writeManifest(referenceId: string): void {
    fs.writeFileSync(path.join(tmpDir, 'appManifest.json'), JSON.stringify({ referenceId }));
  }

  function mockFetchOk(responseData: Record<string, unknown>): void {
    requestMock.mockResolvedValue(
      new Response(JSON.stringify({ data: responseData }), { status: 200 })
    );
  }

  const EMPLOYEE: ModelSchema = {
    name: 'Employee',
    label: 'Employee',
    collection: 'employees',
    fields: [],
  };

  describe('when there is no auth token', () => {
    it('returns ok: false with reason no-token', async () => {
      vi.mocked(appConfig).mockReturnValue({
        read: () => ({ auth: {} }),
        write: () => {},
        path: '/fake/config',
      });

      const outcome = await introspectGraphTypes([EMPLOYEE], tmpDir, false);

      expect(outcome).toEqual({ ok: false, reason: { kind: 'no-token' } });
    });
  });

  describe('when appManifest.json is absent from the source directory', () => {
    it('returns ok: false', async () => {
      const outcome = await introspectGraphTypes([EMPLOYEE], tmpDir, false);

      expect(outcome.ok).toBe(false);
    });

    it('returns reason no-manifest', async () => {
      const outcome = await introspectGraphTypes([EMPLOYEE], tmpDir, false);

      expect((outcome as { ok: false; reason: { kind: string } }).reason.kind).toBe('no-manifest');
    });
  });

  describe('when the client throws a network error', () => {
    it('returns ok: false with reason network-error', async () => {
      writeManifest('myApp_ns1');
      requestMock.mockRejectedValue(
        new GatewayRequestError(
          'POST https://api.workday.com/api/v1/data/graphql failed: ECONNREFUSED: connection refused',
          {
            method: 'POST',
            url: 'https://api.workday.com/api/v1/data/graphql',
            code: 'ECONNREFUSED',
          }
        )
      );

      const outcome = await introspectGraphTypes([EMPLOYEE], tmpDir, false);

      expect(outcome).toEqual({
        ok: false,
        reason: {
          kind: 'network-error',
          message:
            'POST https://api.workday.com/api/v1/data/graphql failed: ECONNREFUSED: connection refused',
        },
      });
    });
  });

  describe('when the API returns a non-200 response', () => {
    it('returns ok: false with reason api-error', async () => {
      writeManifest('myApp_ns1');
      requestMock.mockRejectedValue(
        new GatewayRequestError(
          'POST https://api.workday.com/api/v1/data/graphql failed: HTTP 401 Unauthorized',
          {
            method: 'POST',
            url: 'https://api.workday.com/api/v1/data/graphql',
            status: 401,
          }
        )
      );

      const outcome = await introspectGraphTypes([EMPLOYEE], tmpDir, false);

      expect(outcome).toEqual({
        ok: false,
        reason: {
          kind: 'api-error',
          message: 'POST https://api.workday.com/api/v1/data/graphql failed: HTTP 401 Unauthorized',
        },
      });
    });
  });

  describe('when the API returns GraphQL errors', () => {
    it('returns ok: false with reason api-error', async () => {
      writeManifest('myApp_ns1');
      requestMock.mockResolvedValue(
        new Response(JSON.stringify({ errors: [{ message: 'Syntax error in query' }] }), {
          status: 200,
        })
      );

      const outcome = await introspectGraphTypes([EMPLOYEE], tmpDir, false);

      expect(outcome).toEqual({
        ok: false,
        reason: { kind: 'api-error', message: 'Syntax error in query' },
      });
    });
  });

  describe('when introspection succeeds for all models', () => {
    it('returns ok: true with graph metadata for each model', async () => {
      writeManifest('myApp_ns1');
      mockFetchOk({
        ds_Employee: { inputFields: [{ name: 'myApp_ns1_employees' }] },
        create_Employee: {
          name: 'MyApp_ns1_EmployeesSummary_Create_Input',
          kind: 'INPUT_OBJECT',
        },
        update_Employee: {
          name: 'MyApp_ns1_EmployeesSummary_Update_Input',
          kind: 'INPUT_OBJECT',
        },
      });

      const outcome = await introspectGraphTypes([EMPLOYEE], tmpDir, false);

      expect(outcome).toEqual({
        ok: true,
        result: {
          graph: {
            Employee: {
              dataSourceKey: 'myApp_ns1_employees',
              createInputType: 'MyApp_ns1_EmployeesSummary_Create_Input',
              updateInputType: 'MyApp_ns1_EmployeesSummary_Update_Input',
            },
          },
          missing: [],
        },
      });
    });
  });

  describe('when the DataSources type returns null for a model', () => {
    it('adds that model to the missing list', async () => {
      writeManifest('myApp_ns1');
      mockFetchOk({
        ds_Employee: null,
        create_Employee: { name: 'MyApp_ns1_EmployeesSummary_Create_Input', kind: 'INPUT_OBJECT' },
        update_Employee: { name: 'MyApp_ns1_EmployeesSummary_Update_Input', kind: 'INPUT_OBJECT' },
      });

      const outcome = await introspectGraphTypes([EMPLOYEE], tmpDir, false);

      expect(outcome).toEqual({ ok: true, result: { graph: {}, missing: ['Employee'] } });
    });
  });

  describe('when the create input type returns null for a model', () => {
    it('adds that model to the missing list', async () => {
      writeManifest('myApp_ns1');
      mockFetchOk({
        ds_Employee: { inputFields: [{ name: 'myApp_ns1_employees' }] },
        create_Employee: null,
        update_Employee: { name: 'MyApp_ns1_EmployeesSummary_Update_Input', kind: 'INPUT_OBJECT' },
      });

      const outcome = await introspectGraphTypes([EMPLOYEE], tmpDir, false);

      expect(outcome).toEqual({ ok: true, result: { graph: {}, missing: ['Employee'] } });
    });
  });

  describe('DataSource key selection', () => {
    it('prefers the inputField matching the referenceId_collection convention', async () => {
      writeManifest('myApp_ns1');
      mockFetchOk({
        ds_Employee: {
          inputFields: [{ name: 'myApp_ns1_employeesById' }, { name: 'myApp_ns1_employees' }],
        },
        create_Employee: { name: 'MyApp_ns1_EmployeesSummary_Create_Input', kind: 'INPUT_OBJECT' },
        update_Employee: { name: 'MyApp_ns1_EmployeesSummary_Update_Input', kind: 'INPUT_OBJECT' },
      });

      const outcome = await introspectGraphTypes([EMPLOYEE], tmpDir, false);

      expect(
        (outcome as { ok: true; result: { graph: Record<string, GraphMetadata> } }).result.graph[
          'Employee'
        ].dataSourceKey
      ).toBe('myApp_ns1_employees');
    });

    it('falls back to the first alphabetical inputField when no convention match exists', async () => {
      writeManifest('myApp_ns1');
      mockFetchOk({
        ds_Employee: {
          inputFields: [{ name: 'myApp_ns1_employeesById' }, { name: 'myApp_ns1_activeEmployees' }],
        },
        create_Employee: { name: 'MyApp_ns1_EmployeesSummary_Create_Input', kind: 'INPUT_OBJECT' },
        update_Employee: { name: 'MyApp_ns1_EmployeesSummary_Update_Input', kind: 'INPUT_OBJECT' },
      });

      const outcome = await introspectGraphTypes([EMPLOYEE], tmpDir, false);

      expect(
        (outcome as { ok: true; result: { graph: Record<string, GraphMetadata> } }).result.graph[
          'Employee'
        ].dataSourceKey
      ).toBe('myApp_ns1_activeEmployees');
    });
  });

  describe('field nullability', () => {
    it('populates graph.fields with nullable: false for a NON_NULL field', async () => {
      writeManifest('myApp_ns1');
      mockFetchOk({
        ds_Employee: { inputFields: [{ name: 'myApp_ns1_employees' }] },
        create_Employee: {
          name: 'MyApp_ns1_EmployeesSummary_Create_Input',
          kind: 'INPUT_OBJECT',
          inputFields: [],
        },
        update_Employee: {
          name: 'MyApp_ns1_EmployeesSummary_Update_Input',
          kind: 'INPUT_OBJECT',
          inputFields: [],
        },
        summary_Employee: {
          fields: [
            {
              name: 'name',
              type: { kind: 'NON_NULL', name: null, ofType: { kind: 'SCALAR', name: 'String' } },
            },
          ],
        },
      });

      const outcome = await introspectGraphTypes([EMPLOYEE], tmpDir, false);

      expect(
        (
          outcome as {
            ok: true;
            result: { graph: Record<string, { fields?: Record<string, { nullable: boolean }> }> };
          }
        ).result.graph['Employee']?.fields?.['name']?.nullable
      ).toBe(false);
    });

    it('populates graph.fields with nullable: true for a nullable field', async () => {
      writeManifest('myApp_ns1');
      mockFetchOk({
        ds_Employee: { inputFields: [{ name: 'myApp_ns1_employees' }] },
        create_Employee: {
          name: 'MyApp_ns1_EmployeesSummary_Create_Input',
          kind: 'INPUT_OBJECT',
          inputFields: [],
        },
        update_Employee: {
          name: 'MyApp_ns1_EmployeesSummary_Update_Input',
          kind: 'INPUT_OBJECT',
          inputFields: [],
        },
        summary_Employee: {
          fields: [{ name: 'email', type: { kind: 'SCALAR', name: 'String', ofType: null } }],
        },
      });

      const outcome = await introspectGraphTypes([EMPLOYEE], tmpDir, false);

      expect(
        (
          outcome as {
            ok: true;
            result: { graph: Record<string, { fields?: Record<string, { nullable: boolean }> }> };
          }
        ).result.graph['Employee']?.fields?.['email']?.nullable
      ).toBe(true);
    });

    it('leaves graph.fields absent when summary_ alias returns null', async () => {
      writeManifest('myApp_ns1');
      mockFetchOk({
        ds_Employee: { inputFields: [{ name: 'myApp_ns1_employees' }] },
        create_Employee: {
          name: 'MyApp_ns1_EmployeesSummary_Create_Input',
          kind: 'INPUT_OBJECT',
          inputFields: [],
        },
        update_Employee: {
          name: 'MyApp_ns1_EmployeesSummary_Update_Input',
          kind: 'INPUT_OBJECT',
          inputFields: [],
        },
        summary_Employee: null,
      });

      const outcome = await introspectGraphTypes([EMPLOYEE], tmpDir, false);

      expect(
        (outcome as { ok: true; result: { graph: Record<string, { fields?: unknown }> } }).result
          .graph['Employee']?.fields
      ).toBeUndefined();
    });
  });

  describe('input field requirements', () => {
    it('populates graph.createInputFields with required: true for a NON_NULL input field', async () => {
      writeManifest('myApp_ns1');
      mockFetchOk({
        ds_Employee: { inputFields: [{ name: 'myApp_ns1_employees' }] },
        create_Employee: {
          name: 'MyApp_ns1_EmployeesSummary_Create_Input',
          kind: 'INPUT_OBJECT',
          inputFields: [
            {
              name: 'name',
              type: { kind: 'NON_NULL', name: null, ofType: { kind: 'SCALAR', name: 'String' } },
            },
          ],
        },
        update_Employee: {
          name: 'MyApp_ns1_EmployeesSummary_Update_Input',
          kind: 'INPUT_OBJECT',
          inputFields: [],
        },
        summary_Employee: null,
      });

      const outcome = await introspectGraphTypes([EMPLOYEE], tmpDir, false);

      expect(
        (
          outcome as {
            ok: true;
            result: {
              graph: Record<string, { createInputFields?: Record<string, { required: boolean }> }>;
            };
          }
        ).result.graph['Employee']?.createInputFields?.['name']?.required
      ).toBe(true);
    });

    it('populates graph.createInputFields with required: false for a nullable input field', async () => {
      writeManifest('myApp_ns1');
      mockFetchOk({
        ds_Employee: { inputFields: [{ name: 'myApp_ns1_employees' }] },
        create_Employee: {
          name: 'MyApp_ns1_EmployeesSummary_Create_Input',
          kind: 'INPUT_OBJECT',
          inputFields: [{ name: 'email', type: { kind: 'SCALAR', name: 'String', ofType: null } }],
        },
        update_Employee: {
          name: 'MyApp_ns1_EmployeesSummary_Update_Input',
          kind: 'INPUT_OBJECT',
          inputFields: [],
        },
        summary_Employee: null,
      });

      const outcome = await introspectGraphTypes([EMPLOYEE], tmpDir, false);

      expect(
        (
          outcome as {
            ok: true;
            result: {
              graph: Record<string, { createInputFields?: Record<string, { required: boolean }> }>;
            };
          }
        ).result.graph['Employee']?.createInputFields?.['email']?.required
      ).toBe(false);
    });

    it('leaves graph.createInputFields absent when create_ alias returns no inputFields', async () => {
      writeManifest('myApp_ns1');
      mockFetchOk({
        ds_Employee: { inputFields: [{ name: 'myApp_ns1_employees' }] },
        create_Employee: { name: 'MyApp_ns1_EmployeesSummary_Create_Input', kind: 'INPUT_OBJECT' },
        update_Employee: {
          name: 'MyApp_ns1_EmployeesSummary_Update_Input',
          kind: 'INPUT_OBJECT',
          inputFields: [],
        },
        summary_Employee: null,
      });

      const outcome = await introspectGraphTypes([EMPLOYEE], tmpDir, false);

      expect(
        (
          outcome as {
            ok: true;
            result: { graph: Record<string, { createInputFields?: unknown }> };
          }
        ).result.graph['Employee']?.createInputFields
      ).toBeUndefined();
    });
  });

  describe('when called with a logger', () => {
    it('forwards the logger to the GatewayClient constructor', async () => {
      writeManifest('myApp_ns1');
      mockFetchOk({
        ds_Employee: { inputFields: [{ name: 'myApp_ns1_employees' }] },
        create_Employee: { name: 'MyApp_ns1_EmployeesSummary_Create_Input', kind: 'INPUT_OBJECT' },
        update_Employee: { name: 'MyApp_ns1_EmployeesSummary_Update_Input', kind: 'INPUT_OBJECT' },
      });
      const logger = { isVerbose: true, log: vi.fn() };

      await introspectGraphTypes([EMPLOYEE], tmpDir, false, logger);

      expect(GatewayClient).toHaveBeenCalledWith({
        gateway: 'https://api.workday.com',
        token: 'test-token',
        logger,
      });
    });
  });

  describe('update input field requirements', () => {
    it('populates graph.updateInputFields with required: true for a NON_NULL update input field', async () => {
      writeManifest('myApp_ns1');
      mockFetchOk({
        ds_Employee: { inputFields: [{ name: 'myApp_ns1_employees' }] },
        create_Employee: {
          name: 'MyApp_ns1_EmployeesSummary_Create_Input',
          kind: 'INPUT_OBJECT',
          inputFields: [],
        },
        update_Employee: {
          name: 'MyApp_ns1_EmployeesSummary_Update_Input',
          kind: 'INPUT_OBJECT',
          inputFields: [
            {
              name: 'name',
              type: { kind: 'NON_NULL', name: null, ofType: { kind: 'SCALAR', name: 'String' } },
            },
          ],
        },
        summary_Employee: null,
      });

      const outcome = await introspectGraphTypes([EMPLOYEE], tmpDir, false);

      expect(
        (
          outcome as {
            ok: true;
            result: {
              graph: Record<string, { updateInputFields?: Record<string, { required: boolean }> }>;
            };
          }
        ).result.graph['Employee']?.updateInputFields?.['name']?.required
      ).toBe(true);
    });

    it('leaves graph.updateInputFields absent when update_ alias returns no inputFields', async () => {
      writeManifest('myApp_ns1');
      mockFetchOk({
        ds_Employee: { inputFields: [{ name: 'myApp_ns1_employees' }] },
        create_Employee: {
          name: 'MyApp_ns1_EmployeesSummary_Create_Input',
          kind: 'INPUT_OBJECT',
          inputFields: [],
        },
        update_Employee: { name: 'MyApp_ns1_EmployeesSummary_Update_Input', kind: 'INPUT_OBJECT' },
        summary_Employee: null,
      });

      const outcome = await introspectGraphTypes([EMPLOYEE], tmpDir, false);

      expect(
        (
          outcome as {
            ok: true;
            result: { graph: Record<string, { updateInputFields?: unknown }> };
          }
        ).result.graph['Employee']?.updateInputFields
      ).toBeUndefined();
    });
  });
});

describe('applyIntrospectionOutcome()', () => {
  describe('when outcome is ok: false', () => {
    describe('with reason no-token', () => {
      it('returns schemas unchanged', () => {
        const { schemas } = applyIntrospectionOutcome([BASE_SCHEMA], {
          ok: false,
          reason: { kind: 'no-token' },
        });

        expect(schemas[0]).toBe(BASE_SCHEMA);
      });

      it('returns no warnings', () => {
        const { warnings } = applyIntrospectionOutcome([BASE_SCHEMA], {
          ok: false,
          reason: { kind: 'no-token' },
        });

        expect(warnings).toHaveLength(0);
      });
    });

    describe('with reason no-manifest', () => {
      it('returns schemas unchanged', () => {
        const { schemas } = applyIntrospectionOutcome([BASE_SCHEMA], {
          ok: false,
          reason: { kind: 'no-manifest', path: '/app/appManifest.json' },
        });

        expect(schemas[0]).toBe(BASE_SCHEMA);
      });

      it('returns no warnings', () => {
        const { warnings } = applyIntrospectionOutcome([BASE_SCHEMA], {
          ok: false,
          reason: { kind: 'no-manifest', path: '/app/appManifest.json' },
        });

        expect(warnings).toHaveLength(0);
      });
    });

    describe('with reason network-error', () => {
      it('includes the error message in the warning', () => {
        const { warnings } = applyIntrospectionOutcome([BASE_SCHEMA], {
          ok: false,
          reason: { kind: 'network-error', message: 'ECONNREFUSED' },
        });

        expect(warnings[0]).toContain('ECONNREFUSED');
      });

      it('includes the accuracy impact statement in the warning', () => {
        const { warnings } = applyIntrospectionOutcome([BASE_SCHEMA], {
          ok: false,
          reason: { kind: 'network-error', message: 'ECONNREFUSED' },
        });

        expect(warnings[0]).toContain('may not accurately reflect');
      });
    });

    describe('with reason api-error', () => {
      it('includes the error message in the warning', () => {
        const { warnings } = applyIntrospectionOutcome([BASE_SCHEMA], {
          ok: false,
          reason: { kind: 'api-error', message: 'HTTP 401: Unauthorized' },
        });

        expect(warnings[0]).toContain('HTTP 401: Unauthorized');
      });
    });
  });

  describe('when outcome is ok: true with no missing models', () => {
    it('attaches graph metadata to the matching schema', () => {
      const { schemas } = applyIntrospectionOutcome([BASE_SCHEMA], {
        ok: true,
        result: { graph: { Employee: GRAPH_META }, missing: [] },
      });

      expect(schemas[0].graph).toEqual(GRAPH_META);
    });

    it('returns no warnings', () => {
      const { warnings } = applyIntrospectionOutcome([BASE_SCHEMA], {
        ok: true,
        result: { graph: { Employee: GRAPH_META }, missing: [] },
      });

      expect(warnings).toHaveLength(0);
    });

    it('does not mutate the original schema object', () => {
      applyIntrospectionOutcome([BASE_SCHEMA], {
        ok: true,
        result: { graph: { Employee: GRAPH_META }, missing: [] },
      });

      expect(BASE_SCHEMA.graph).toBeUndefined();
    });
  });

  describe('when outcome is ok: true with some missing models', () => {
    it('leaves the missing model schema without a graph field', () => {
      const { schemas } = applyIntrospectionOutcome([BASE_SCHEMA], {
        ok: true,
        result: { graph: {}, missing: ['Employee'] },
      });

      expect(schemas[0].graph).toBeUndefined();
    });

    it('names the missing models in the warning', () => {
      const { warnings } = applyIntrospectionOutcome([BASE_SCHEMA], {
        ok: true,
        result: { graph: {}, missing: ['Employee'] },
      });

      expect(warnings[0]).toContain('Employee');
    });

    it('includes the accuracy impact statement in the warning', () => {
      const { warnings } = applyIntrospectionOutcome([BASE_SCHEMA], {
        ok: true,
        result: { graph: {}, missing: ['Employee'] },
      });

      expect(warnings[0]).toContain('may not accurately reflect');
    });

    it('still attaches graph to models that were not missing', () => {
      const DEPT: ModelSchema = {
        name: 'Department',
        label: 'Dept',
        collection: 'depts',
        fields: [],
      };
      const DEPT_META: GraphMetadata = {
        dataSourceKey: 'myApp_depts',
        createInputType: 'Prefix_DeptsSummary_Create_Input',
        updateInputType: 'Prefix_DeptsSummary_Update_Input',
      };

      const { schemas } = applyIntrospectionOutcome([BASE_SCHEMA, DEPT], {
        ok: true,
        result: { graph: { Department: DEPT_META }, missing: ['Employee'] },
      });

      expect(schemas[1].graph).toEqual(DEPT_META);
    });
  });
});
