import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TridentResolver } from '../../src/data/TridentResolver.js';
import type { ModelSchema } from '../../src/data/types.js';

const SCHEMA: ModelSchema = { fields: [], collection: 'things', securityDomains: [] };

function mockFetch(data: unknown[] = []) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data: { app_ns1_Thing: { data } } }),
  });
}

beforeEach(() => {
  vi.stubGlobal('window', { location: { origin: 'https://tenant.workday.com' } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TridentResolver', () => {
  describe('when sending a request', () => {
    it('sends requests to the graphql endpoint on the current origin', async () => {
      globalThis.fetch = mockFetch();

      await new TridentResolver('app_ns1', { Thing: SCHEMA }).find('Thing');

      expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
        'https://tenant.workday.com/api/data/graphql'
      );
    });

    it('does not send an Authorization header', async () => {
      globalThis.fetch = mockFetch();

      await new TridentResolver('app_ns1', { Thing: SCHEMA }).find('Thing');

      const headers = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]
        .headers as Record<string, string>;
      expect(headers['authorization']).toBeUndefined();
    });
  });
});
