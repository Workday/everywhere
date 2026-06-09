import { describe, it, expect, vi } from 'vitest';
import { GraphQLClient } from '../../src/data/GraphQLClient.js';
import { HttpClient, HttpAuthError } from '../../src/data/HttpClient.js';

function fakeHttpClient(response: unknown): HttpClient & { request: ReturnType<typeof vi.fn> } {
  const request = vi.fn().mockResolvedValue(response);
  return { request } as unknown as HttpClient & { request: ReturnType<typeof vi.fn> };
}

describe('GraphQLClient', () => {
  describe('endpoint', () => {
    it('defaults to /api/v1/proxy/graphql/v5', async () => {
      const http = fakeHttpClient({ data: {} });
      await new GraphQLClient(http).execute('{ q }');
      expect(http.request).toHaveBeenCalledWith('/api/v1/proxy/graphql/v5', expect.any(Object));
    });

    it('uses a custom endpoint when provided', async () => {
      const http = fakeHttpClient({ data: {} });
      await new GraphQLClient(http, '/custom/graphql').execute('{ q }');
      expect(http.request).toHaveBeenCalledWith('/custom/graphql', expect.any(Object));
    });
  });

  describe('envelope', () => {
    it('POSTs a body of { query, variables }', async () => {
      const http = fakeHttpClient({ data: {} });
      await new GraphQLClient(http).execute('{ q }', { id: '1' });
      expect(http.request).toHaveBeenCalledWith('/api/v1/proxy/graphql/v5', {
        method: 'POST',
        body: { query: '{ q }', variables: { id: '1' } },
      });
    });

    it('omits variables when not provided', async () => {
      const http = fakeHttpClient({ data: {} });
      await new GraphQLClient(http).execute('{ q }');
      const sent = (http.request.mock.calls[0]?.[1] as { body: unknown }).body as Record<string, unknown>;
      expect('variables' in sent).toBe(false);
    });
  });

  describe('response handling', () => {
    it('returns the data field on success', async () => {
      const http = fakeHttpClient({ data: { x: 1 } });
      const result = await new GraphQLClient(http).execute<{ x: number }>('{ x }');
      expect(result).toEqual({ x: 1 });
    });
  });

  describe('error handling', () => {
    it('throws an error joining all error messages with semicolons', async () => {
      const http = fakeHttpClient({ errors: [{ message: 'a' }, { message: 'b' }] });
      await expect(new GraphQLClient(http).execute('{ q }')).rejects.toThrow(/a; b/);
    });

    it('throws HttpAuthError when an error has extension code UNAUTHENTICATED', async () => {
      const http = fakeHttpClient({ errors: [{ message: 'nope', extensions: { code: 'UNAUTHENTICATED' } }] });
      await expect(new GraphQLClient(http).execute('{ q }')).rejects.toBeInstanceOf(HttpAuthError);
    });

    it('throws HttpAuthError when an error has extension code FORBIDDEN', async () => {
      const http = fakeHttpClient({ errors: [{ message: 'nope', extensions: { code: 'FORBIDDEN' } }] });
      await expect(new GraphQLClient(http).execute('{ q }')).rejects.toBeInstanceOf(HttpAuthError);
    });
  });
});
