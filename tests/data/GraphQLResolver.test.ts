import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphQLResolver } from '../../src/data/GraphQLResolver.js';
import { GraphQLClient } from '../../src/data/GraphQLClient.js';
import type { ModelSchema } from '../../src/data/types.js';

vi.mock('../../src/data/GraphQLClient.js', () => ({
  GraphQLClient: vi.fn(function (this: { execute: ReturnType<typeof vi.fn> } | undefined) {
    if (this) this.execute = vi.fn();
  }),
}));

const SCHEMA: ModelSchema = {
  name: 'Thing',
  label: 'Thing',
  fields: [],
  collection: 'things',
  securityDomains: [],
};
const SCHEMA_WITH_REFS: ModelSchema = {
  name: 'Widget',
  label: 'Widget',
  collection: 'widgets',
  securityDomains: [],
  fields: [
    { name: 'name', type: 'TEXT' },
    { name: 'category', type: 'SINGLE_INSTANCE', target: 'WidgetCategory' },
  ],
};
const ENDPOINT = 'https://tenant.example.com/api/v1/tenant/graphql/v5';
const REFERENCE_ID = 'examplePlugin_test9999';

const SCHEMA_WITH_GRAPH: ModelSchema = {
  name: 'Thing',
  label: 'Thing',
  collection: 'things',
  fields: [],
  securityDomains: [],
  graph: {
    dataSourceKey: 'custom_things_datasource',
    createInputType: 'Custom_ThingsSummary_Create_Input',
    updateInputType: 'Custom_ThingsSummary_Update_Input',
  },
};

function installExecute(execute: ReturnType<typeof vi.fn>): void {
  vi.mocked(GraphQLClient).mockImplementation(function (this: { execute: typeof execute }) {
    this.execute = execute;
  } as never);
}

beforeEach(() => {
  vi.mocked(GraphQLClient).mockClear();
});

describe('GraphQLResolver', () => {
  describe('update()', () => {
    it('uses the collection id argument with IdentifierInput in the query', async () => {
      const execute = vi
        .fn()
        .mockResolvedValueOnce({
          [`${REFERENCE_ID}_Widget`]: {
            data: [{ workdayID: { id: 'widget-001', type: 'WID' }, name: 'Before' }],
          },
        })
        .mockResolvedValueOnce({
          [`${REFERENCE_ID}_updateWidget`]: {
            workdayID: { id: 'widget-001', type: 'WID' },
            name: 'Updated',
          },
        });
      installExecute(execute);

      await new GraphQLResolver(REFERENCE_ID, { Widget: SCHEMA_WITH_REFS }, ENDPOINT).update(
        'Widget',
        'widget-001',
        { name: 'Updated' }
      );

      expect(execute.mock.calls[1][0]).toContain('widgetsId: $widgetsId');
    });

    it('does not use a generic id argument in the query', async () => {
      const execute = vi
        .fn()
        .mockResolvedValueOnce({
          [`${REFERENCE_ID}_Widget`]: {
            data: [{ workdayID: { id: 'widget-001', type: 'WID' }, name: 'Before' }],
          },
        })
        .mockResolvedValueOnce({
          [`${REFERENCE_ID}_updateWidget`]: {
            workdayID: { id: 'widget-001', type: 'WID' },
            name: 'Updated',
          },
        });
      installExecute(execute);

      await new GraphQLResolver(REFERENCE_ID, { Widget: SCHEMA_WITH_REFS }, ENDPOINT).update(
        'Widget',
        'widget-001',
        { name: 'Updated' }
      );

      expect(execute.mock.calls[1][0]).not.toContain('id: $id');
    });

    it('passes the IdentifierInput variables to the mutation', async () => {
      const execute = vi
        .fn()
        .mockResolvedValueOnce({
          [`${REFERENCE_ID}_Widget`]: {
            data: [{ workdayID: { id: 'widget-001', type: 'WID' }, name: 'Before' }],
          },
        })
        .mockResolvedValueOnce({
          [`${REFERENCE_ID}_updateWidget`]: {
            workdayID: { id: 'widget-001', type: 'WID' },
            name: 'Updated',
          },
        });
      installExecute(execute);

      await new GraphQLResolver(REFERENCE_ID, { Widget: SCHEMA_WITH_REFS }, ENDPOINT).update(
        'Widget',
        'widget-001',
        { name: 'Updated' }
      );

      expect(execute.mock.calls[1][1]).toEqual({
        widgetsId: { id: 'widget-001', type: 'WID' },
        input: { name: 'Updated' },
      });
    });
  });

  describe('update() with a SINGLE_INSTANCE field marked embeddedInput', () => {
    it('wraps the identifier in a nested id field for the mutation input', async () => {
      const schema: ModelSchema = {
        name: 'Widget',
        label: 'Widget',
        collection: 'widgets',
        securityDomains: [],
        fields: [
          {
            name: 'attachment',
            type: 'SINGLE_INSTANCE',
            target: 'WidgetFile',
            embeddedInput: true,
          },
        ],
      };
      const execute = vi
        .fn()
        .mockResolvedValueOnce({
          [`${REFERENCE_ID}_Widget`]: {
            data: [{ workdayID: { id: 'widget-001', type: 'WID' } }],
          },
        })
        .mockResolvedValueOnce({
          [`${REFERENCE_ID}_updateWidget`]: {
            workdayID: { id: 'widget-001', type: 'WID' },
          },
        });
      installExecute(execute);

      await new GraphQLResolver(REFERENCE_ID, { Widget: schema }, ENDPOINT).update(
        'Widget',
        'widget-001',
        { attachment: 'file-id-abc' }
      );

      expect(execute.mock.calls[1][1]).toEqual({
        widgetsId: { id: 'widget-001', type: 'WID' },
        input: { attachment: { id: { id: 'file-id-abc', type: 'WID' } } },
      });
    });
  });

  describe('remove()', () => {
    it('uses the collection id argument with IdentifierInput in the query', async () => {
      const execute = vi
        .fn()
        .mockResolvedValueOnce({
          [`${REFERENCE_ID}_Widget`]: {
            data: [{ workdayID: { id: 'widget-001', type: 'WID' }, name: 'Before' }],
          },
        })
        .mockResolvedValueOnce({
          [`${REFERENCE_ID}_deleteWidget`]: { workdayID: { id: 'widget-001' } },
        });
      installExecute(execute);

      await new GraphQLResolver(REFERENCE_ID, { Widget: SCHEMA_WITH_REFS }, ENDPOINT).remove(
        'Widget',
        'widget-001'
      );

      expect(execute.mock.calls[1][0]).toContain('widgetsId: $widgetsId');
    });

    it('does not use a generic id argument in the query', async () => {
      const execute = vi
        .fn()
        .mockResolvedValueOnce({
          [`${REFERENCE_ID}_Widget`]: {
            data: [{ workdayID: { id: 'widget-001', type: 'WID' }, name: 'Before' }],
          },
        })
        .mockResolvedValueOnce({
          [`${REFERENCE_ID}_deleteWidget`]: { workdayID: { id: 'widget-001' } },
        });
      installExecute(execute);

      await new GraphQLResolver(REFERENCE_ID, { Widget: SCHEMA_WITH_REFS }, ENDPOINT).remove(
        'Widget',
        'widget-001'
      );

      expect(execute.mock.calls[1][0]).not.toContain('id: $id');
    });

    it('passes the IdentifierInput as variables to the mutation', async () => {
      const execute = vi
        .fn()
        .mockResolvedValueOnce({
          [`${REFERENCE_ID}_Widget`]: {
            data: [{ workdayID: { id: 'widget-001', type: 'WID' }, name: 'Before' }],
          },
        })
        .mockResolvedValueOnce({
          [`${REFERENCE_ID}_deleteWidget`]: { workdayID: { id: 'widget-001' } },
        });
      installExecute(execute);

      await new GraphQLResolver(REFERENCE_ID, { Widget: SCHEMA_WITH_REFS }, ENDPOINT).remove(
        'Widget',
        'widget-001'
      );

      expect(execute.mock.calls[1][1]).toEqual({
        widgetsId: { id: 'widget-001', type: 'WID' },
      });
    });
  });

  describe('find()', () => {
    it('requests SINGLE_INSTANCE reference fields in the selection set', async () => {
      const execute = vi.fn().mockResolvedValue({ [`${REFERENCE_ID}_Widget`]: { data: [] } });
      installExecute(execute);

      await new GraphQLResolver(REFERENCE_ID, { Widget: SCHEMA_WITH_REFS }, ENDPOINT).find(
        'Widget'
      );

      expect(execute.mock.calls[0][0]).toContain('category { workdayID { id type } }');
    });
  });

  describe('update() when workdayID type was returned from a prior find', () => {
    it('uses the cached workday id type in IdentifierInput', async () => {
      const widgetId = 'd5e6b709d87090011d1d6bf64ad10000';
      const execute = vi
        .fn()
        .mockResolvedValueOnce({
          [`${REFERENCE_ID}_Widget`]: {
            data: [
              {
                workdayID: { id: widgetId, type: 'Widget_ID' },
                name: 'Gadget',
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          [`${REFERENCE_ID}_updateWidget`]: {
            workdayID: { id: widgetId, type: 'Widget_ID' },
            name: 'Updated',
          },
        });
      installExecute(execute);

      const resolver = new GraphQLResolver(REFERENCE_ID, { Widget: SCHEMA_WITH_REFS }, ENDPOINT);
      await resolver.update('Widget', widgetId, { name: 'Updated' });

      expect(execute.mock.calls[1][1]).toEqual({
        widgetsId: { id: widgetId, type: 'Widget_ID' },
        input: { name: 'Updated' },
      });
    });
  });

  describe('when schema has graph metadata', () => {
    describe('find()', () => {
      it('uses graph.dataSourceKey in the query instead of the convention-derived key', async () => {
        const execute = vi.fn().mockResolvedValue({ app_ns1_Thing: { data: [] } });
        installExecute(execute);

        await new GraphQLResolver('app_ns1', { Thing: SCHEMA_WITH_GRAPH }, ENDPOINT).find('Thing');

        expect(execute.mock.calls[0][0]).toContain('custom_things_datasource');
      });

      it('does not use the convention-derived key when graph.dataSourceKey is present', async () => {
        const execute = vi.fn().mockResolvedValue({ app_ns1_Thing: { data: [] } });
        installExecute(execute);

        await new GraphQLResolver('app_ns1', { Thing: SCHEMA_WITH_GRAPH }, ENDPOINT).find('Thing');

        expect(execute.mock.calls[0][0]).not.toContain('app_ns1_things');
      });
    });

    describe('create()', () => {
      it('uses graph.createInputType instead of the convention-derived type', async () => {
        const execute = vi
          .fn()
          .mockResolvedValue({ app_ns1_createThing: { workdayID: { id: '1' } } });
        installExecute(execute);

        await new GraphQLResolver('app_ns1', { Thing: SCHEMA_WITH_GRAPH }, ENDPOINT).create(
          'Thing',
          {}
        );

        expect(execute.mock.calls[0][0]).toContain('Custom_ThingsSummary_Create_Input');
      });
    });

    describe('update()', () => {
      it('uses graph.updateInputType instead of the convention-derived type', async () => {
        const execute = vi
          .fn()
          .mockResolvedValueOnce({
            app_ns1_Thing: {
              data: [{ workdayID: { id: '1', type: 'WID' } }],
            },
          })
          .mockResolvedValueOnce({
            app_ns1_updateThing: { workdayID: { id: '1', type: 'WID' } },
          });
        installExecute(execute);

        await new GraphQLResolver('app_ns1', { Thing: SCHEMA_WITH_GRAPH }, ENDPOINT).update(
          'Thing',
          '1',
          {}
        );

        expect(execute.mock.calls[1][0]).toContain('Custom_ThingsSummary_Update_Input');
      });
    });
  });

  describe('constructor', () => {
    it('passes an explicit endpoint to GraphQLClient', () => {
      installExecute(vi.fn());

      new GraphQLResolver('app_ns1', { Thing: SCHEMA }, ENDPOINT);

      expect(vi.mocked(GraphQLClient)).toHaveBeenCalledWith('', ENDPOINT);
    });

    it('defaults to the tenant graphql endpoint on the current origin', () => {
      vi.stubGlobal('window', { location: { origin: 'https://tenant.example.com' } });
      installExecute(vi.fn());

      new GraphQLResolver('app_ns1', { Thing: SCHEMA });

      expect(vi.mocked(GraphQLClient)).toHaveBeenCalledWith(
        '',
        'https://tenant.example.com/api/v1/tenant/graphql/v5'
      );

      vi.unstubAllGlobals();
    });
  });
});
