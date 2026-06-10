import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createTenantForwarder } from '../../src/data/proxy-forwarder.js';

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

describe('createTenantForwarder', () => {
  describe('upstream forwarding', () => {
    it('treats req.url as the path after the /api/v1/tenant mount prefix', async () => {
      const fetchMock = mockFetch(async () => okResponse());
      const forwarder = createTenantForwarder({
        gateway: 'https://impl.example',
        getToken: async () => 'tok',
      });
      const { res } = fakeResponse();
      // The mount strips /api/v1/tenant; req.url is what's left.
      await forwarder(fakeRequest({ method: 'GET', url: '/common/v1/workers/me' }), res);
      expect(fetchMock.mock.calls[0]?.[0]).toBe('https://impl.example/common/v1/workers/me');
    });

    it('forwards the path verbatim to upstream', async () => {
      const fetchMock = mockFetch(async () => okResponse());
      const forwarder = createTenantForwarder({
        gateway: 'https://impl.example',
        getToken: async () => 'tok',
      });
      const { res } = fakeResponse();
      await forwarder(fakeRequest({ method: 'GET', url: '/common/v1/workers/me' }), res);
      expect(fetchMock.mock.calls[0]?.[0]).toBe('https://impl.example/common/v1/workers/me');
    });

    it('forwards a GraphQL path verbatim to upstream', async () => {
      const fetchMock = mockFetch(async () => okResponse());
      const forwarder = createTenantForwarder({
        gateway: 'https://impl.example',
        getToken: async () => 'tok',
      });
      const { res } = fakeResponse();
      await forwarder(fakeRequest({ method: 'GET', url: '/graphql/v5' }), res);
      expect(fetchMock.mock.calls[0]?.[0]).toBe('https://impl.example/graphql/v5');
    });

    it('forwards the HTTP method', async () => {
      const fetchMock = mockFetch(async () => okResponse());
      const forwarder = createTenantForwarder({
        gateway: 'https://impl.example',
        getToken: async () => 'tok',
      });
      const { res } = fakeResponse();
      await forwarder(
        fakeRequest({ method: 'POST', url: '/common/v1/workers/me', body: '{}' }),
        res
      );
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(init.method).toBe('POST');
    });

    it('passes upstream status through to the response', async () => {
      mockFetch(async () => new Response('{"err":true}', { status: 418 }));
      const forwarder = createTenantForwarder({
        gateway: 'https://impl.example',
        getToken: async () => 'tok',
      });
      const { res, status } = fakeResponse();
      await forwarder(fakeRequest({ method: 'GET', url: '/common/v1/workers/me' }), res);
      expect(status()).toBe(418);
    });
  });

  describe('auth header', () => {
    it('injects Authorization: Bearer <token>', async () => {
      const fetchMock = mockFetch(async () => okResponse());
      const forwarder = createTenantForwarder({
        gateway: 'https://impl.example',
        getToken: async () => 'my-token',
      });
      const { res } = fakeResponse();
      await forwarder(fakeRequest({ method: 'GET', url: '/common/v1/workers/me' }), res);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer my-token');
    });
  });

  describe('missing token', () => {
    it('responds 401 without contacting upstream', async () => {
      mockFetch(async () => okResponse());
      const forwarder = createTenantForwarder({
        gateway: 'https://impl.example',
        getToken: async () => null,
      });
      const { res, status } = fakeResponse();
      await forwarder(fakeRequest({ method: 'GET', url: '/common/v1/workers/me' }), res);
      expect(status()).toBe(401);
    });

    it('does not call fetch when token is missing', async () => {
      const fetchMock = mockFetch(async () => okResponse());
      const forwarder = createTenantForwarder({
        gateway: 'https://impl.example',
        getToken: async () => null,
      });
      const { res } = fakeResponse();
      await forwarder(fakeRequest({ method: 'GET', url: '/common/v1/workers/me' }), res);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('request body error', () => {
    it('responds 400 when the request body cannot be read', async () => {
      mockFetch(async () => okResponse());
      const forwarder = createTenantForwarder({
        gateway: 'https://impl.example',
        getToken: async () => 'tok',
      });
      const { res, status } = fakeResponse();
      const listeners: Record<string, ((arg: unknown) => void)[]> = {};
      const req = {
        method: 'POST',
        url: '/common/v1/workers',
        headers: {},
        on(event: string, cb: (arg: unknown) => void) {
          listeners[event] = listeners[event] ?? [];
          listeners[event].push(cb);
          return req;
        },
      } as unknown as IncomingMessage;
      setImmediate(() => {
        listeners['error']?.forEach((l) => l(new Error('client aborted')));
      });
      await forwarder(req, res);
      expect(status()).toBe(400);
    });
  });

  describe('upstream failure', () => {
    it('responds 502 when fetch rejects', async () => {
      mockFetch(async () => {
        throw new Error('connection refused');
      });
      const forwarder = createTenantForwarder({
        gateway: 'https://impl.example',
        getToken: async () => 'tok',
      });
      const { res, status } = fakeResponse();
      await forwarder(fakeRequest({ method: 'GET', url: '/common/v1/workers/me' }), res);
      expect(status()).toBe(502);
    });
  });
});
