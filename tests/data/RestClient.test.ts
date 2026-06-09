import { describe, it, expect, vi } from 'vitest';
import { RestClient } from '../../src/data/RestClient.js';
import { HttpClient } from '../../src/data/HttpClient.js';

function fakeHttpClient(): HttpClient & { request: ReturnType<typeof vi.fn> } {
  const request = vi.fn().mockResolvedValue({ ok: true });
  return { request } as unknown as HttpClient & { request: ReturnType<typeof vi.fn> };
}

describe('RestClient', () => {
  describe('constructor', () => {
    it('accepts a baseUrl string and uses it for an internal HttpClient', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({}),
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      const client = new RestClient('https://api.example');
      await client.get('/x');
      expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.example/x');
    });
  });

  describe('get', () => {
    it('issues a GET request to the path', async () => {
      const http = fakeHttpClient();
      await new RestClient(http).get('/me');
      expect(http.request).toHaveBeenCalledWith('/me', { method: 'GET', headers: undefined, signal: undefined });
    });
  });

  describe('post', () => {
    it('issues a POST with a JSON body', async () => {
      const http = fakeHttpClient();
      await new RestClient(http).post('/x', { a: 1 });
      expect(http.request).toHaveBeenCalledWith('/x', { method: 'POST', body: { a: 1 }, headers: undefined, signal: undefined });
    });
  });

  describe('put', () => {
    it('issues a PUT with a JSON body', async () => {
      const http = fakeHttpClient();
      await new RestClient(http).put('/x', { a: 1 });
      expect(http.request).toHaveBeenCalledWith('/x', { method: 'PUT', body: { a: 1 }, headers: undefined, signal: undefined });
    });
  });

  describe('patch', () => {
    it('issues a PATCH with a JSON body', async () => {
      const http = fakeHttpClient();
      await new RestClient(http).patch('/x', { a: 1 });
      expect(http.request).toHaveBeenCalledWith('/x', { method: 'PATCH', body: { a: 1 }, headers: undefined, signal: undefined });
    });
  });

  describe('delete', () => {
    it('issues a DELETE request', async () => {
      const http = fakeHttpClient();
      await new RestClient(http).delete('/x/1');
      expect(http.request).toHaveBeenCalledWith('/x/1', { method: 'DELETE', headers: undefined, signal: undefined });
    });
  });

  describe('options pass-through', () => {
    it('forwards headers to the underlying HttpClient', async () => {
      const http = fakeHttpClient();
      await new RestClient(http).get('/x', { headers: { 'x-custom': 'v' } });
      expect(http.request).toHaveBeenCalledWith('/x', expect.objectContaining({ headers: { 'x-custom': 'v' } }));
    });

    it('forwards abort signal to the underlying HttpClient', async () => {
      const http = fakeHttpClient();
      const signal = new AbortController().signal;
      await new RestClient(http).get('/x', { signal });
      expect(http.request).toHaveBeenCalledWith('/x', expect.objectContaining({ signal }));
    });
  });
});
