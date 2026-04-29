import { describe, it, expect, vi } from 'vitest';
import { TridentResolver } from '../../src/data/TridentResolver.js';
import type { ModelSchema } from '../../src/data/types.js';

const SCHEMA: ModelSchema = { fields: [], collection: 'things', securityDomains: [] };

function makeResolver(endpoint: string, path: string) {
  return new TridentResolver(endpoint, path, 'token', 'app_ns1', { Thing: SCHEMA });
}

function mockFetch(data: unknown[] = []) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data: { app_ns1_Thing: { data } } }),
  });
}

describe('TridentResolver', () => {
  describe('when a base endpoint and path are provided', () => {
    it('sends requests to the concatenated URL', async () => {
      globalThis.fetch = mockFetch();

      await makeResolver('https://api.us.wcp.workday.com', '/graphql/v5').find('Thing');

      expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
        'https://api.us.wcp.workday.com/graphql/v5'
      );
    });

    it('uses a relative path as the full fetch URL when endpoint is empty', async () => {
      globalThis.fetch = mockFetch();

      await makeResolver('', '/api/data/graphql').find('Thing');

      expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
        '/api/data/graphql'
      );
    });
  });
});
