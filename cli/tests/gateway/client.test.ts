import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GatewayClient,
  GatewayRequestError,
  resetEnvLoggedForTesting,
} from '../../src/gateway/client.js';

describe('GatewayRequestError', () => {
  it('carries the method and url', () => {
    const err = new GatewayRequestError('boom', {
      method: 'GET',
      url: 'https://api.example.com/x',
    });

    expect(err.method).toBe('GET');
  });

  it('carries the url', () => {
    const err = new GatewayRequestError('boom', {
      method: 'GET',
      url: 'https://api.example.com/x',
    });

    expect(err.url).toBe('https://api.example.com/x');
  });

  it('carries the status when provided', () => {
    const err = new GatewayRequestError('boom', {
      method: 'GET',
      url: 'https://api.example.com/x',
      status: 401,
    });

    expect(err.status).toBe(401);
  });

  it('carries the code when provided', () => {
    const err = new GatewayRequestError('boom', {
      method: 'GET',
      url: 'https://api.example.com/x',
      code: 'ECONNREFUSED',
    });

    expect(err.code).toBe('ECONNREFUSED');
  });
});

describe('GatewayClient', () => {
  describe('construction', () => {
    it('can be constructed with gateway and token', () => {
      const client = new GatewayClient({
        gateway: 'https://api.example.com',
        token: 'tok',
      });

      expect(client).toBeInstanceOf(GatewayClient);
    });
  });

  describe('request', () => {
    beforeEach(() => {
      vi.unstubAllGlobals();
      resetEnvLoggedForTesting();
    });

    it('joins the path onto the gateway URL', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);
      const client = new GatewayClient({
        gateway: 'https://api.example.com',
        token: 'tok',
      });

      await client.request({ method: 'GET', path: '/api/v1/me' });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/me',
        expect.anything()
      );
    });

    it('sends a bearer authorization header', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);
      const client = new GatewayClient({
        gateway: 'https://api.example.com',
        token: 'tok-abc',
      });

      await client.request({ method: 'GET', path: '/x' });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer tok-abc' }),
        })
      );
    });

    it('returns the raw Response on success', async () => {
      const response = new Response('hi', { status: 200 });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
      const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

      const result = await client.request({ method: 'GET', path: '/x' });

      expect(result).toBe(response);
    });

    it('throws GatewayRequestError with status when response is not ok', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response('nope', { status: 401, statusText: 'Unauthorized' }))
      );
      const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

      await expect(client.request({ method: 'GET', path: '/x' })).rejects.toMatchObject({
        name: 'GatewayRequestError',
        method: 'GET',
        url: 'https://api.example.com/x',
        status: 401,
      });
    });

    it('throws GatewayRequestError with code when fetch throws with a cause', async () => {
      const cause = Object.assign(new Error('unable to get local issuer certificate'), {
        code: 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
      });
      const fetchErr = new TypeError('fetch failed', { cause });
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(fetchErr));
      const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

      await expect(client.request({ method: 'GET', path: '/x' })).rejects.toMatchObject({
        name: 'GatewayRequestError',
        method: 'GET',
        url: 'https://api.example.com/x',
        code: 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
      });
    });

    it('formats the message with the unwrapped cause', async () => {
      const cause = Object.assign(new Error('unable to get local issuer certificate'), {
        code: 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
      });
      const fetchErr = new TypeError('fetch failed', { cause });
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(fetchErr));
      const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

      await expect(client.request({ method: 'GET', path: '/x' })).rejects.toThrow(
        'GET https://api.example.com/x failed: UNABLE_TO_GET_ISSUER_CERT_LOCALLY: unable to get local issuer certificate'
      );
    });

    it('falls back to message when no code is present', async () => {
      const cause = new Error('socket hang up');
      const fetchErr = new TypeError('fetch failed', { cause });
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(fetchErr));
      const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

      await expect(client.request({ method: 'GET', path: '/x' })).rejects.toThrow(
        'GET https://api.example.com/x failed: socket hang up'
      );
    });
  });

  describe('verbose logging', () => {
    function makeLogger(isVerbose = true) {
      return {
        isVerbose,
        log: vi.fn(),
      };
    }

    beforeEach(() => {
      vi.unstubAllGlobals();
      resetEnvLoggedForTesting();
    });

    it('logs the method and url before the request', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
      const logger = makeLogger();
      const client = new GatewayClient({
        gateway: 'https://api.example.com',
        token: 'tok',
        logger,
      });

      await client.request({ method: 'GET', path: '/x' });

      expect(logger.log).toHaveBeenCalledWith('Requesting GET https://api.example.com/x');
    });

    it('logs the response status after the request', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(null, { status: 200, statusText: 'OK' }))
      );
      const logger = makeLogger();
      const client = new GatewayClient({
        gateway: 'https://api.example.com',
        token: 'tok',
        logger,
      });

      await client.request({ method: 'GET', path: '/x' });

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringMatching(/^Response: 200 OK \(\d+ms\)$/)
      );
    });

    it('logs the failure message when fetch throws', async () => {
      const cause = Object.assign(new Error('boom'), { code: 'ETIMEDOUT' });
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed', { cause })));
      const logger = makeLogger();
      const client = new GatewayClient({
        gateway: 'https://api.example.com',
        token: 'tok',
        logger,
      });

      await client.request({ method: 'GET', path: '/x' }).catch(() => {});

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringMatching(/^Request failed: ETIMEDOUT: boom \(\d+ms\)$/)
      );
    });

    it('emits nothing when logger isVerbose is false', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
      const logger = makeLogger(false);
      const client = new GatewayClient({
        gateway: 'https://api.example.com',
        token: 'tok',
        logger,
      });

      await client.request({ method: 'GET', path: '/x' });

      expect(logger.log).not.toHaveBeenCalled();
    });

    it('does not throw when no logger is provided', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
      const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

      await expect(client.request({ method: 'GET', path: '/x' })).resolves.toBeDefined();
    });

    it('appends elapsed ms to the response line', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(null, { status: 200, statusText: 'OK' }))
      );
      const logger = makeLogger();
      const client = new GatewayClient({
        gateway: 'https://api.example.com',
        token: 'tok',
        logger,
      });

      await client.request({ method: 'GET', path: '/x' });

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringMatching(/^Response: 200 OK \(\d+ms\)$/)
      );
    });

    it('appends elapsed ms to the failure line', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('socket hang up')));
      const logger = makeLogger();
      const client = new GatewayClient({
        gateway: 'https://api.example.com',
        token: 'tok',
        logger,
      });

      await client.request({ method: 'GET', path: '/x' }).catch(() => {});

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringMatching(/^Request failed: socket hang up \(\d+ms\)$/)
      );
    });
  });

  describe('getJson', () => {
    beforeEach(() => {
      vi.unstubAllGlobals();
    });

    it('returns the parsed JSON body on success', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify({ sub: 'u1', tenant: 't1' }), { status: 200 })
          )
      );
      const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

      const result = await client.getJson<{ sub: string; tenant: string }>('/api/v1/me');

      expect(result).toEqual({ sub: 'u1', tenant: 't1' });
    });

    it('throws GatewayRequestError when the body is not valid JSON', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not-json', { status: 200 })));
      const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

      await expect(client.getJson('/x')).rejects.toThrow(
        'GET https://api.example.com/x failed: response was not valid JSON'
      );
    });
  });

  describe('getText', () => {
    beforeEach(() => {
      vi.unstubAllGlobals();
    });

    it('returns the response body as text', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response('hello world', { status: 200 }))
      );
      const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

      const result = await client.getText('/x');

      expect(result).toBe('hello world');
    });
  });

  describe('postJson', () => {
    beforeEach(() => {
      vi.unstubAllGlobals();
    });

    it('serializes the body as JSON with content-type header', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);
      const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

      await client.postJson('/x', { hello: 'world' });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/x',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ hello: 'world' }),
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
    });

    it('returns the parsed response on success', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'abc' }), { status: 200 }))
      );
      const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

      const result = await client.postJson<{ id: string }>('/x', {});

      expect(result).toEqual({ id: 'abc' });
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      vi.unstubAllGlobals();
    });

    it('issues a DELETE request', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
      vi.stubGlobal('fetch', fetchMock);
      const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

      await client.delete('/x');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/x',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('resolves when the status check passes', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
      const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

      await expect(client.delete('/x')).resolves.toBeUndefined();
    });
  });

  describe('environment dump', () => {
    beforeEach(() => {
      vi.unstubAllGlobals();
      resetEnvLoggedForTesting();
    });

    function makeLogger() {
      return { isVerbose: true, log: vi.fn() };
    }

    it('logs the environment block before the first request', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
      const logger = makeLogger();
      const client = new GatewayClient({
        gateway: 'https://api.example.com',
        token: 'tok',
        logger,
      });

      await client.request({ method: 'GET', path: '/x' });

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Environment:'));
    });

    it('does not log the environment block on subsequent requests', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
      const logger = makeLogger();
      const client = new GatewayClient({
        gateway: 'https://api.example.com',
        token: 'tok',
        logger,
      });

      await client.request({ method: 'GET', path: '/x' });
      logger.log.mockClear();
      await client.request({ method: 'GET', path: '/y' });

      const envCalls = logger.log.mock.calls.filter(
        ([msg]) => typeof msg === 'string' && msg.includes('Environment:')
      );
      expect(envCalls).toHaveLength(0);
    });

    it('shows (not set) for unset env vars', async () => {
      vi.stubEnv('HTTPS_PROXY', '');
      vi.stubEnv('HTTP_PROXY', '');
      vi.stubEnv('NO_PROXY', '');
      vi.stubEnv('NODE_EXTRA_CA_CERTS', '');
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
      const logger = makeLogger();
      const client = new GatewayClient({
        gateway: 'https://api.example.com',
        token: 'tok',
        logger,
      });

      await client.request({ method: 'GET', path: '/x' });

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('HTTPS_PROXY: (not set)'));
    });

    it('shows the value when HTTPS_PROXY is set', async () => {
      vi.stubEnv('HTTPS_PROXY', 'http://proxy.example.com:8080');
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
      const logger = makeLogger();
      const client = new GatewayClient({
        gateway: 'https://api.example.com',
        token: 'tok',
        logger,
      });

      await client.request({ method: 'GET', path: '/x' });

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('HTTPS_PROXY: http://proxy.example.com:8080')
      );
    });

    it('does not throw when no logger is provided', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
      const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

      await expect(client.request({ method: 'GET', path: '/x' })).resolves.toBeDefined();
    });
  });

  describe('fromCommand', () => {
    beforeEach(() => {
      vi.unstubAllGlobals();
      resetEnvLoggedForTesting();
    });

    it('uses the provided logger when isVerbose is true', async () => {
      const logger = {
        get isVerbose() {
          return true;
        },
        log: vi.fn(),
      };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

      const client = GatewayClient.fromCommand(logger, {
        gateway: 'https://api.example.com',
        token: 'tok',
      });
      await client.request({ method: 'GET', path: '/x' });

      expect(logger.log).toHaveBeenCalledWith('Requesting GET https://api.example.com/x');
    });

    it('does not log when logger isVerbose is false', async () => {
      const logger = {
        get isVerbose() {
          return false;
        },
        log: vi.fn(),
      };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

      const client = GatewayClient.fromCommand(logger, {
        gateway: 'https://api.example.com',
        token: 'tok',
      });
      await client.request({ method: 'GET', path: '/x' });

      expect(logger.log).not.toHaveBeenCalled();
    });
  });
});
