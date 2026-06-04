import { describe, expect, it } from 'vitest';
import { GatewayClient, GatewayRequestError } from '../../src/gateway/client.js';

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
});
