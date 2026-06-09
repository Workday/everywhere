import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient, HttpError, HttpAuthError } from '../../src/data/HttpClient.js';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  delete (globalThis as { __WE_APP_ID__?: string }).__WE_APP_ID__;
});

describe('HttpError', () => {
  it('carries status', () => {
    const err = new HttpError(500, 'Server Error', { detail: 'boom' });
    expect(err.status).toBe(500);
  });

  it('carries statusText', () => {
    const err = new HttpError(500, 'Server Error', { detail: 'boom' });
    expect(err.statusText).toBe('Server Error');
  });

  it('carries body', () => {
    const err = new HttpError(500, 'Server Error', { detail: 'boom' });
    expect(err.body).toEqual({ detail: 'boom' });
  });
});

describe('HttpAuthError', () => {
  it('is an HttpError', () => {
    const err = new HttpAuthError(401, 'Unauthorized');
    expect(err).toBeInstanceOf(HttpError);
  });

  it('mentions running auth login in its message', () => {
    const err = new HttpAuthError(401, 'Unauthorized');
    expect(err.message).toMatch(/auth login/);
  });
});

describe('HttpClient.request', () => {
  function mockFetch(response: Partial<Response>): ReturnType<typeof vi.fn> {
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(null),
      text: () => Promise.resolve(''),
      ...response,
    });
    globalThis.fetch = mock as unknown as typeof fetch;
    return mock;
  }

  describe('URL composition', () => {
    it('uses the path verbatim when baseUrl is empty', async () => {
      const fetchMock = mockFetch({ json: () => Promise.resolve({}) });
      await new HttpClient().request('/api/v1/proxy/x');
      expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/proxy/x');
    });

    it('prepends baseUrl when set', async () => {
      const fetchMock = mockFetch({ json: () => Promise.resolve({}) });
      await new HttpClient('https://h.example').request('/x');
      expect(fetchMock.mock.calls[0]?.[0]).toBe('https://h.example/x');
    });
  });

  describe('headers', () => {
    it('sends accept and content-type for JSON', async () => {
      const fetchMock = mockFetch({ json: () => Promise.resolve({}) });
      await new HttpClient().request('/x');
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect((init.headers as Record<string, string>)['accept']).toBe('application/json');
    });

    it('injects x-app-id from globalThis.__WE_APP_ID__ when present', async () => {
      (globalThis as { __WE_APP_ID__?: string }).__WE_APP_ID__ = 'my-app';
      const fetchMock = mockFetch({ json: () => Promise.resolve({}) });
      await new HttpClient().request('/x');
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect((init.headers as Record<string, string>)['x-app-id']).toBe('my-app');
    });

    it('merges caller-provided headers', async () => {
      const fetchMock = mockFetch({ json: () => Promise.resolve({}) });
      await new HttpClient().request('/x', { headers: { 'x-custom': 'v' } });
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect((init.headers as Record<string, string>)['x-custom']).toBe('v');
    });
  });

  describe('method and body', () => {
    it('defaults to GET', async () => {
      const fetchMock = mockFetch({ json: () => Promise.resolve({}) });
      await new HttpClient().request('/x');
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(init.method).toBe('GET');
    });

    it('serializes body as JSON', async () => {
      const fetchMock = mockFetch({ json: () => Promise.resolve({}) });
      await new HttpClient().request('/x', { method: 'POST', body: { a: 1 } });
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(init.body).toBe('{"a":1}');
    });
  });

  describe('response parsing', () => {
    it('returns parsed JSON for 2xx responses', async () => {
      mockFetch({ json: () => Promise.resolve({ ok: true }) });
      const result = await new HttpClient().request<{ ok: boolean }>('/x');
      expect(result).toEqual({ ok: true });
    });

    it('returns undefined when the body is not JSON', async () => {
      mockFetch({
        json: () => Promise.reject(new Error('not json')),
        text: () => Promise.resolve(''),
      });
      const result = await new HttpClient().request('/x');
      expect(result).toBeUndefined();
    });
  });

  describe('error mapping', () => {
    it('throws HttpAuthError on 401', async () => {
      mockFetch({ ok: false, status: 401, statusText: 'Unauthorized' });
      await expect(new HttpClient().request('/x')).rejects.toBeInstanceOf(HttpAuthError);
    });

    it('throws HttpAuthError on 403', async () => {
      mockFetch({ ok: false, status: 403, statusText: 'Forbidden' });
      await expect(new HttpClient().request('/x')).rejects.toBeInstanceOf(HttpAuthError);
    });

    it('throws HttpError on non-auth 4xx', async () => {
      mockFetch({ ok: false, status: 404, statusText: 'Not Found' });
      const error = await new HttpClient().request('/x').catch((e: unknown) => e);
      expect(error).toBeInstanceOf(HttpError);
    });

    it('throws HttpError on 5xx', async () => {
      mockFetch({ ok: false, status: 500, statusText: 'Server Error' });
      await expect(new HttpClient().request('/x')).rejects.toBeInstanceOf(HttpError);
    });
  });

  describe('abort signal', () => {
    it('passes the signal through to fetch', async () => {
      const fetchMock = mockFetch({ json: () => Promise.resolve({}) });
      const controller = new AbortController();
      await new HttpClient().request('/x', { signal: controller.signal });
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(init.signal).toBe(controller.signal);
    });
  });
});
