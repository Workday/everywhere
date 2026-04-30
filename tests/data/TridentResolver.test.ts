import { describe, it, expect, vi, afterEach } from 'vitest';
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

afterEach(() => {
  delete (globalThis as Record<string, unknown>)['__WE_TRIDENT_ENDPOINT__'];
  delete (globalThis as Record<string, unknown>)['__WE_TRIDENT_TOKEN__'];
});

describe('TridentResolver', () => {
  describe('when constructed with only referenceId and schemas', () => {
    describe('and no dev globals are set', () => {
      it('sends requests to the dev proxy endpoint by default', async () => {
        globalThis.fetch = mockFetch();

        await new TridentResolver('app_ns1', { Thing: SCHEMA }).find('Thing');

        expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
          '/_we/trident'
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

    describe('and dev globals are injected by everywhere view', () => {
      it('sends requests to the injected endpoint', async () => {
        (globalThis as Record<string, unknown>)['__WE_TRIDENT_ENDPOINT__'] =
          'https://api.us.wcp.workday.com/graphql/v5';
        globalThis.fetch = mockFetch();

        await new TridentResolver('app_ns1', { Thing: SCHEMA }).find('Thing');

        expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
          'https://api.us.wcp.workday.com/graphql/v5'
        );
      });

      it('sends the injected token in the Authorization header', async () => {
        (globalThis as Record<string, unknown>)['__WE_TRIDENT_ENDPOINT__'] =
          'https://api.us.wcp.workday.com/graphql/v5';
        (globalThis as Record<string, unknown>)['__WE_TRIDENT_TOKEN__'] = 'injected-token';
        globalThis.fetch = mockFetch();

        await new TridentResolver('app_ns1', { Thing: SCHEMA }).find('Thing');

        const headers = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]
          .headers as Record<string, string>;
        expect(headers['authorization']).toBe('Bearer injected-token');
      });
    });
  });

  describe('when a custom endpoint is provided via options', () => {
    it('uses the explicit endpoint even when dev globals are set', async () => {
      (globalThis as Record<string, unknown>)['__WE_TRIDENT_ENDPOINT__'] =
        'https://injected.example.com/graphql/v5';
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
    it('sends the explicit token in the Authorization header', async () => {
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
