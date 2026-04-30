import { describe, it, expect, vi } from 'vitest';
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

describe('TridentResolver', () => {
  describe('when constructed with only referenceId and schemas', () => {
    it('sends requests to the dev proxy endpoint by default', async () => {
      globalThis.fetch = mockFetch();

      await new TridentResolver('app_ns1', { Thing: SCHEMA }).find('Thing');

      expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('/_we/trident');
    });

    it('does not send an Authorization header', async () => {
      globalThis.fetch = mockFetch();

      await new TridentResolver('app_ns1', { Thing: SCHEMA }).find('Thing');

      const headers = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]
        .headers as Record<string, string>;
      expect(headers['authorization']).toBeUndefined();
    });
  });

  describe('when a custom endpoint is provided via options', () => {
    it('sends requests to that endpoint', async () => {
      globalThis.fetch = mockFetch();

      await new TridentResolver(
        'app_ns1',
        { Thing: SCHEMA },
        {
          endpoint: 'https://api.us.wcp.workday.com/graphql/v5',
        }
      ).find('Thing');

      expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
        'https://api.us.wcp.workday.com/graphql/v5'
      );
    });
  });

  describe('when a bearerToken is provided via options', () => {
    it('sends the token in the Authorization header', async () => {
      globalThis.fetch = mockFetch();

      await new TridentResolver(
        'app_ns1',
        { Thing: SCHEMA },
        {
          endpoint: 'https://api.us.wcp.workday.com/graphql/v5',
          bearerToken: 'my-token',
        }
      ).find('Thing');

      const headers = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]
        .headers as Record<string, string>;
      expect(headers['authorization']).toBe('Bearer my-token');
    });
  });
});
