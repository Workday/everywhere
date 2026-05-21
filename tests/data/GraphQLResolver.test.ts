import { describe, it, expect, vi, afterEach } from 'vitest';
import { GraphQLResolver } from '../../src/data/GraphQLResolver.js';
import type { ModelSchema } from '../../src/data/types.js';

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
const ENDPOINT = 'https://tenant.workday.com/api/v1/data/graphql';
const REFERENCE_ID = 'examplePlugin_test9999';

function mockFetch(data: unknown[] = []) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data: { app_ns1_Thing: { data } } }),
  });
}

describe('GraphQLResolver', () => {
  describe('when constructed with an explicit endpoint', () => {
    it('sends requests to that endpoint', async () => {
      globalThis.fetch = mockFetch();

      await new GraphQLResolver('app_ns1', { Thing: SCHEMA }, ENDPOINT).find('Thing');

      expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(ENDPOINT);
    });
  });

  describe('when constructed without an endpoint', () => {
    it('sends requests to the graphql endpoint on the current origin', async () => {
      vi.stubGlobal('window', { location: { origin: 'https://tenant.workday.com' } });
      globalThis.fetch = mockFetch();

      await new GraphQLResolver('app_ns1', { Thing: SCHEMA }).find('Thing');

      expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(ENDPOINT);

      vi.unstubAllGlobals();
    });
  });

  describe('when sending a request', () => {
    it('does not send an Authorization header', async () => {
      globalThis.fetch = mockFetch();

      await new GraphQLResolver('app_ns1', { Thing: SCHEMA }, ENDPOINT).find('Thing');

      const headers = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]
        .headers as Record<string, string>;
      expect(headers['authorization']).toBeUndefined();
    });
  });

  describe('when __WE_APP_ID__ global is set', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('sends the x-app-id header with the app id value', async () => {
      vi.stubGlobal('__WE_APP_ID__', '@acme/my-plugin');
      globalThis.fetch = mockFetch();

      await new GraphQLResolver('app_ns1', { Thing: SCHEMA }, ENDPOINT).find('Thing');

      const headers = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]
        .headers as Record<string, string>;
      expect(headers['x-app-id']).toBe('@acme/my-plugin');
    });
  });

  describe('update()', () => {
    it('uses the collection id argument with IdentifierInput', async () => {
      const findResponse = {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: {
              [`${REFERENCE_ID}_Widget`]: {
                data: [{ workdayID: { id: 'widget-001', type: 'WID' }, name: 'Before' }],
              },
            },
          }),
      };
      const updateResponse = {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: {
              [`${REFERENCE_ID}_updateWidget`]: {
                workdayID: { id: 'widget-001', type: 'WID' },
                name: 'Updated',
              },
            },
          }),
      };
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(findResponse)
        .mockResolvedValueOnce(updateResponse);
      globalThis.fetch = mockFetch;

      await new GraphQLResolver(REFERENCE_ID, { Widget: SCHEMA_WITH_REFS }, ENDPOINT).update(
        'Widget',
        'widget-001',
        { name: 'Updated' }
      );

      const body = JSON.parse((mockFetch.mock.calls[1] as [string, { body: string }])[1].body) as {
        query: string;
        variables: Record<string, unknown>;
      };
      expect(body.query).toContain('widgetsId: $widgetsId');
      expect(body.query).not.toContain('id: $id');
      expect(body.variables).toEqual({
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
      const findResponse = {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: {
              [`${REFERENCE_ID}_Widget`]: {
                data: [{ workdayID: { id: 'widget-001', type: 'WID' } }],
              },
            },
          }),
      };
      const updateResponse = {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: {
              [`${REFERENCE_ID}_updateWidget`]: {
                workdayID: { id: 'widget-001', type: 'WID' },
              },
            },
          }),
      };
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(findResponse)
        .mockResolvedValueOnce(updateResponse);
      globalThis.fetch = mockFetch;

      await new GraphQLResolver(REFERENCE_ID, { Widget: schema }, ENDPOINT).update(
        'Widget',
        'widget-001',
        { attachment: 'file-id-abc' }
      );

      const body = JSON.parse((mockFetch.mock.calls[1] as [string, { body: string }])[1].body) as {
        variables: Record<string, unknown>;
      };
      expect(body.variables).toEqual({
        widgetsId: { id: 'widget-001', type: 'WID' },
        input: { attachment: { id: { id: 'file-id-abc', type: 'WID' } } },
      });
    });
  });

  describe('remove()', () => {
    it('uses the collection id argument with IdentifierInput', async () => {
      const findResponse = {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: {
              [`${REFERENCE_ID}_Widget`]: {
                data: [{ workdayID: { id: 'widget-001', type: 'WID' }, name: 'Before' }],
              },
            },
          }),
      };
      const deleteResponse = {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: { [`${REFERENCE_ID}_deleteWidget`]: { workdayID: { id: 'widget-001' } } },
          }),
      };
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(findResponse)
        .mockResolvedValueOnce(deleteResponse);
      globalThis.fetch = mockFetch;

      await new GraphQLResolver(REFERENCE_ID, { Widget: SCHEMA_WITH_REFS }, ENDPOINT).remove(
        'Widget',
        'widget-001'
      );

      const body = JSON.parse((mockFetch.mock.calls[1] as [string, { body: string }])[1].body) as {
        query: string;
        variables: Record<string, unknown>;
      };
      expect(body.query).toContain('widgetsId: $widgetsId');
      expect(body.query).not.toContain('id: $id');
      expect(body.variables).toEqual({ widgetsId: { id: 'widget-001', type: 'WID' } });
    });
  });

  describe('find()', () => {
    it('requests SINGLE_INSTANCE reference fields in the selection set', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: { [`${REFERENCE_ID}_Widget`]: { data: [] } },
          }),
      });
      globalThis.fetch = mockFetch;

      await new GraphQLResolver(REFERENCE_ID, { Widget: SCHEMA_WITH_REFS }, ENDPOINT).find(
        'Widget'
      );

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, { body: string }])[1].body) as {
        query: string;
      };
      expect(body.query).toContain('category { workdayID { id type } }');
    });
  });

  describe('update() when workdayID type was returned from a prior find', () => {
    it('uses the cached workday id type in IdentifierInput', async () => {
      const widgetId = 'd5e6b709d87090011d1d6bf64ad10000';
      const listFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: {
              [`${REFERENCE_ID}_Widget`]: {
                data: [
                  {
                    workdayID: { id: widgetId, type: 'Widget_ID' },
                    name: 'Gadget',
                  },
                ],
              },
            },
          }),
      });
      const updateFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: {
              [`${REFERENCE_ID}_updateWidget`]: {
                workdayID: { id: widgetId, type: 'Widget_ID' },
                name: 'Updated',
              },
            },
          }),
      });
      globalThis.fetch = vi
        .fn()
        .mockImplementationOnce(listFetch)
        .mockImplementationOnce(updateFetch);

      const resolver = new GraphQLResolver(REFERENCE_ID, { Widget: SCHEMA_WITH_REFS }, ENDPOINT);
      await resolver.update('Widget', widgetId, { name: 'Updated' });

      const body = JSON.parse(
        (updateFetch.mock.calls[0] as [string, { body: string }])[1].body
      ) as { variables: Record<string, unknown> };
      expect(body.variables).toEqual({
        widgetsId: { id: widgetId, type: 'Widget_ID' },
        input: { name: 'Updated' },
      });
    });
  });

  describe('when __WE_APP_ID__ global is not set', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('does not send an x-app-id header', async () => {
      globalThis.fetch = mockFetch();

      await new GraphQLResolver('app_ns1', { Thing: SCHEMA }, ENDPOINT).find('Thing');

      const headers = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]
        .headers as Record<string, string>;
      expect(headers['x-app-id']).toBeUndefined();
    });
  });
});
