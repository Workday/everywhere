import { describe, it, expect, vi, afterEach } from 'vitest';
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
});
