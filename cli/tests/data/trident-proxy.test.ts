import { describe, it, expect, vi, beforeEach } from 'vitest';
import { proxyTrident } from '../../src/data/trident-proxy.js';
import type { AppConfig } from '../../src/config.js';

function makeReq(body: unknown) {
  const chunks: Buffer[] = [Buffer.from(JSON.stringify(body))];
  return {
    method: 'POST',
    on: (event: string, cb: (arg?: unknown) => void) => {
      if (event === 'data') chunks.forEach((c) => cb(c));
      if (event === 'end') cb();
    },
  };
}

function makeRes() {
  const res = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: '',
    writeHead: vi.fn((status: number, headers: Record<string, string>) => {
      res.statusCode = status;
      res.headers = headers;
    }),
    end: vi.fn((body: string) => {
      res.body = body;
    }),
  };
  return res;
}

describe('proxyTrident', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  describe('when auth config is missing', () => {
    it('responds 401 with a login instruction', async () => {
      const res = makeRes();

      await proxyTrident(makeReq({ query: '{}' }) as never, res as never, {} as AppConfig);

      expect(res.statusCode).toBe(401);
    });

    it('includes a message directing the user to auth login', async () => {
      const res = makeRes();

      await proxyTrident(makeReq({ query: '{}' }) as never, res as never, {} as AppConfig);

      const body = JSON.parse(res.body) as { errors: { message: string }[] };
      expect(body.errors[0]?.message).toMatch('auth login');
    });
  });

  describe('when auth config is present', () => {
    const config: AppConfig = {
      auth: { gateway: 'api.us.wcp.workday.com', https: true, token: 'test-token' },
    };

    it('forwards the request to the configured Trident endpoint', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('{"data":{}}'),
      });

      await proxyTrident(makeReq({ query: '{}' }) as never, res() as never, config);

      expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
        'https://api.us.wcp.workday.com/graphql/v5'
      );
    });

    it('injects the stored bearer token into the forwarded request', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('{"data":{}}'),
      });

      await proxyTrident(makeReq({ query: '{}' }) as never, res() as never, config);

      const headers = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]
        .headers as Record<string, string>;
      expect(headers['authorization']).toBe('Bearer test-token');
    });
  });
});

function res() {
  return makeRes();
}
