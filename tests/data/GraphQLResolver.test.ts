import { describe, it, expect, vi } from 'vitest';
import { GraphQLResolver } from '../../src/data/GraphQLResolver.js';
import type { ModelSchema } from '../../src/data/types.js';

const SCHEMA: ModelSchema = { fields: [], collection: 'things', securityDomains: [] };
const ENDPOINT = 'https://tenant.workday.com/api/v1/data/graphql';

function mockFetch(data: unknown[] = []) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data: { app_ns1_Thing: { data } } }),
  });
}

function mockMutationFetch(mutationKey: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        data: {
          [mutationKey]: { workdayID: { id: '1', type: 'Thing' }, descriptor: 'T' },
        },
      }),
  });
}

describe('GraphQLResolver', () => {
  describe('create', () => {
    describe('when creating a record', () => {
      it('uses the correct input type name in the mutation', async () => {
        globalThis.fetch = mockMutationFetch('app_ns1_createThing');

        await new GraphQLResolver('app_ns1', { Thing: SCHEMA }, ENDPOINT).create('Thing', {
          descriptor: 'T',
        });

        const body = JSON.parse(
          (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
        );
        expect(body.query).toContain('$input: App_ns1_ThingsSummary_CreateInput!');
      });
    });
  });

  describe('update', () => {
    describe('when updating a record', () => {
      it('uses the correct input type name in the mutation', async () => {
        globalThis.fetch = mockMutationFetch('app_ns1_updateThing');

        await new GraphQLResolver('app_ns1', { Thing: SCHEMA }, ENDPOINT).update('Thing', '1', {
          descriptor: 'T',
        });

        const body = JSON.parse(
          (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
        );
        expect(body.query).toContain('$input: App_ns1_ThingsSummary_UpdateInput!');
      });
    });
  });

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
});
