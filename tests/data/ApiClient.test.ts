import { describe, it, expect, vi, afterEach } from 'vitest';
import { ApiClient } from '../../src/data/ApiClient.js';

const BASE_URL = 'https://api.example-tenant.workday.com';

function mockFetch(body: unknown = {}, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Internal Server Error',
    json: () => Promise.resolve(body),
  });
}

describe('ApiClient', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('URL construction', () => {
    describe('when no path is provided', () => {
      it('sends the request to the base URL', async () => {
        globalThis.fetch = mockFetch();

        await new ApiClient(BASE_URL).get();

        expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(BASE_URL);
      });
    });

    describe('when a path is provided', () => {
      it('appends the path to the base URL', async () => {
        globalThis.fetch = mockFetch();

        await new ApiClient(BASE_URL).get('/users');

        expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
          `${BASE_URL}/users`
        );
      });

      it('handles a leading slash in the path', async () => {
        globalThis.fetch = mockFetch();

        await new ApiClient(BASE_URL + '/').get('/users');

        expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
          `${BASE_URL}/users`
        );
      });
    });
  });

  describe('serialization', () => {
    it('serializes the request body to JSON', async () => {
      globalThis.fetch = mockFetch();
      const body = { name: 'Alice' };

      await new ApiClient(BASE_URL).post('/users', body);

      const init = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
      expect(init.body).toBe(JSON.stringify(body));
    });

    it('deserializes the JSON response', async () => {
      const responseData = { id: 1, name: 'Alice' };
      globalThis.fetch = mockFetch(responseData);

      const result = await new ApiClient(BASE_URL).get<typeof responseData>();

      expect(result).toEqual(responseData);
    });
  });

  describe('request headers', () => {
    describe('Content-Type', () => {
      it('sets Content-Type to application/json when a body is provided', async () => {
        globalThis.fetch = mockFetch();

        await new ApiClient(BASE_URL).post('/users', { name: 'Alice' });

        const headers = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]
          .headers as Record<string, string>;
        expect(headers['Content-Type']).toBe('application/json');
      });

      it('omits Content-Type when no body is provided', async () => {
        globalThis.fetch = mockFetch();

        await new ApiClient(BASE_URL).get('/users');

        const headers = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]
          .headers as Record<string, string>;
        expect(headers['Content-Type']).toBeUndefined();
      });
    });

    describe('CRID', () => {
      it('includes an X-CRID header on every request', async () => {
        globalThis.fetch = mockFetch();

        await new ApiClient(BASE_URL).get();

        const headers = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]
          .headers as Record<string, string>;
        expect(headers['X-CRID']).toBeDefined();
      });

      it('generates a unique X-CRID for each request', async () => {
        globalThis.fetch = mockFetch();
        const client = new ApiClient(BASE_URL);

        await client.get();
        await client.get();

        const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
        const firstCrid = (
          fetchMock.mock.calls[0][1] as RequestInit & { headers: Record<string, string> }
        ).headers['X-CRID'];
        const secondCrid = (
          fetchMock.mock.calls[1][1] as RequestInit & { headers: Record<string, string> }
        ).headers['X-CRID'];
        expect(firstCrid).not.toBe(secondCrid);
      });
    });
  });

  describe('HTTP methods', () => {
    it('uses GET for get()', async () => {
      globalThis.fetch = mockFetch();

      await new ApiClient(BASE_URL).get();

      expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].method).toBe('GET');
    });

    it('uses POST for post()', async () => {
      globalThis.fetch = mockFetch();

      await new ApiClient(BASE_URL).post();

      expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].method).toBe('POST');
    });

    it('uses PUT for put()', async () => {
      globalThis.fetch = mockFetch();

      await new ApiClient(BASE_URL).put();

      expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].method).toBe('PUT');
    });

    it('uses DELETE for delete()', async () => {
      globalThis.fetch = mockFetch();

      await new ApiClient(BASE_URL).delete();

      expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].method).toBe('DELETE');
    });

    it('uses PATCH for patch()', async () => {
      globalThis.fetch = mockFetch();

      await new ApiClient(BASE_URL).patch();

      expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].method).toBe('PATCH');
    });
  });

  describe('timeout', () => {
    describe('when no timeout is configured', () => {
      it('aborts the request after 30 seconds', () => {
        vi.useFakeTimers();
        let capturedSignal: AbortSignal | undefined;
        globalThis.fetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
          capturedSignal = init.signal as AbortSignal;
          return new Promise(() => {});
        });

        new ApiClient(BASE_URL).get();
        vi.advanceTimersByTime(30_000);

        expect(capturedSignal?.aborted).toBe(true);
      });

      it('does not abort before 30 seconds', () => {
        vi.useFakeTimers();
        let capturedSignal: AbortSignal | undefined;
        globalThis.fetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
          capturedSignal = init.signal as AbortSignal;
          return new Promise(() => {});
        });

        new ApiClient(BASE_URL).get();
        vi.advanceTimersByTime(29_999);

        expect(capturedSignal?.aborted).toBe(false);
      });
    });

    describe('when a custom timeout is configured', () => {
      it('aborts the request after the configured duration', () => {
        vi.useFakeTimers();
        let capturedSignal: AbortSignal | undefined;
        globalThis.fetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
          capturedSignal = init.signal as AbortSignal;
          return new Promise(() => {});
        });

        new ApiClient(BASE_URL, { timeout: 5_000 }).get();
        vi.advanceTimersByTime(5_000);

        expect(capturedSignal?.aborted).toBe(true);
      });
    });
  });

  describe('error handling', () => {
    describe('when the response status is not ok', () => {
      it('throws an error that includes the status code', async () => {
        globalThis.fetch = mockFetch({}, 500);

        await expect(new ApiClient(BASE_URL).get()).rejects.toThrow('500');
      });
    });
  });
});
