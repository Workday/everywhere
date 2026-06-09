import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { rewriteProxyPath, createProxyForwarder } from '../../src/data/proxy-forwarder.js';

describe('rewriteProxyPath', () => {
  describe('REST path', () => {
    it('strips /api/v1/proxy/ and injects tenant after the version', () => {
      const out = rewriteProxyPath('/api/v1/proxy/common/v1/workers/me', 'acmeco');
      expect(out).toBe('/ccx/api/common/v1/acmeco/workers/me');
    });
  });

  describe('GraphQL path', () => {
    it('appends tenant when the path ends at the version', () => {
      const out = rewriteProxyPath('/api/v1/proxy/graphql/v5', 'acmeco');
      expect(out).toBe('/ccx/api/graphql/v5/acmeco');
    });
  });

  describe('rejection', () => {
    it('returns null for paths outside the proxy prefix', () => {
      expect(rewriteProxyPath('/other/path', 'acmeco')).toBeNull();
    });

    it('returns null when there are fewer than two segments after the prefix', () => {
      expect(rewriteProxyPath('/api/v1/proxy/onlyone', 'acmeco')).toBeNull();
    });
  });
});

interface FakeRes {
  res: ServerResponse;
  status: () => number;
  headers: () => Record<string, string>;
  body: () => string;
}

function fakeResponse(): FakeRes {
  let status = 0;
  let body = '';
  let headers: Record<string, string> = {};
  const res = {
    writeHead(s: number, h?: Record<string, string>) {
      status = s;
      if (h) headers = h;
      return res;
    },
    end(b?: string) {
      body = b ?? '';
      return res;
    },
    setHeader() {},
  } as unknown as ServerResponse;
  return { res, status: () => status, headers: () => headers, body: () => body };
}

function fakeRequest(opts: {
  method: string;
  url: string;
  body?: string;
  headers?: Record<string, string>;
}): IncomingMessage {
  const listeners: Record<string, ((arg: unknown) => void)[]> = {};
  const req = {
    method: opts.method,
    url: opts.url,
    headers: opts.headers ?? {},
    on(event: string, cb: (arg: unknown) => void) {
      listeners[event] = listeners[event] ?? [];
      listeners[event].push(cb);
      return req;
    },
  } as unknown as IncomingMessage;
  setImmediate(() => {
    const reqBody = opts.body;
    if (reqBody) listeners['data']?.forEach((l) => l(Buffer.from(reqBody)));
    listeners['end']?.forEach((l) => l(undefined));
  });
  return req;
}

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockFetch(
  impl: (url: string, init: RequestInit) => Promise<Response>
): ReturnType<typeof vi.fn> {
  const mock = vi.fn().mockImplementation(impl);
  globalThis.fetch = mock as unknown as typeof fetch;
  return mock;
}

function okResponse(body = '{}'): Response {
  return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
}

describe('createProxyForwarder', () => {
  describe('upstream forwarding', () => {
    it('rewrites the path before calling upstream', async () => {
      const fetchMock = mockFetch(async () => okResponse());
      const forwarder = createProxyForwarder({
        gateway: 'https://impl.example',
        tenant: 'acmeco',
        getToken: async () => 'tok',
      });
      const { res } = fakeResponse();
      await forwarder(
        fakeRequest({ method: 'GET', url: '/api/v1/proxy/common/v1/workers/me' }),
        res
      );
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        'https://impl.example/ccx/api/common/v1/acmeco/workers/me'
      );
    });

    it('forwards the HTTP method', async () => {
      const fetchMock = mockFetch(async () => okResponse());
      const forwarder = createProxyForwarder({
        gateway: 'https://impl.example',
        tenant: 'acmeco',
        getToken: async () => 'tok',
      });
      const { res } = fakeResponse();
      await forwarder(
        fakeRequest({ method: 'POST', url: '/api/v1/proxy/common/v1/workers/me', body: '{}' }),
        res
      );
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(init.method).toBe('POST');
    });

    it('passes upstream status through to the response', async () => {
      mockFetch(async () => new Response('{"err":true}', { status: 418 }));
      const forwarder = createProxyForwarder({
        gateway: 'https://impl.example',
        tenant: 'acmeco',
        getToken: async () => 'tok',
      });
      const { res, status } = fakeResponse();
      await forwarder(
        fakeRequest({ method: 'GET', url: '/api/v1/proxy/common/v1/workers/me' }),
        res
      );
      expect(status()).toBe(418);
    });
  });

  describe('auth header', () => {
    it('injects Authorization: Bearer <token>', async () => {
      const fetchMock = mockFetch(async () => okResponse());
      const forwarder = createProxyForwarder({
        gateway: 'https://impl.example',
        tenant: 'acmeco',
        getToken: async () => 'my-token',
      });
      const { res } = fakeResponse();
      await forwarder(
        fakeRequest({ method: 'GET', url: '/api/v1/proxy/common/v1/workers/me' }),
        res
      );
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer my-token');
    });
  });

  describe('missing token', () => {
    it('responds 401 without contacting upstream', async () => {
      mockFetch(async () => okResponse());
      const forwarder = createProxyForwarder({
        gateway: 'https://impl.example',
        tenant: 'acmeco',
        getToken: async () => null,
      });
      const { res, status } = fakeResponse();
      await forwarder(
        fakeRequest({ method: 'GET', url: '/api/v1/proxy/common/v1/workers/me' }),
        res
      );
      expect(status()).toBe(401);
    });

    it('does not call fetch when token is missing', async () => {
      const fetchMock = mockFetch(async () => okResponse());
      const forwarder = createProxyForwarder({
        gateway: 'https://impl.example',
        tenant: 'acmeco',
        getToken: async () => null,
      });
      const { res } = fakeResponse();
      await forwarder(
        fakeRequest({ method: 'GET', url: '/api/v1/proxy/common/v1/workers/me' }),
        res
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('upstream failure', () => {
    it('responds 502 when fetch rejects', async () => {
      mockFetch(async () => {
        throw new Error('connection refused');
      });
      const forwarder = createProxyForwarder({
        gateway: 'https://impl.example',
        tenant: 'acmeco',
        getToken: async () => 'tok',
      });
      const { res, status } = fakeResponse();
      await forwarder(
        fakeRequest({ method: 'GET', url: '/api/v1/proxy/common/v1/workers/me' }),
        res
      );
      expect(status()).toBe(502);
    });
  });
});
