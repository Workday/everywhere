import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/gateway/client.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/gateway/client.js')>(
    '../../src/gateway/client.js'
  );
  return {
    ...actual,
    GatewayClient: vi.fn(),
  };
});

import { deleteFromRegistry } from '../../src/registry/registry.js';
import { GatewayClient, GatewayRequestError } from '../../src/gateway/client.js';

describe('deleteFromRegistry', () => {
  const baseOptions = {
    gateway: 'https://registry.example.com',
    token: 'test-token',
    appId: 'abc123',
  };
  let deleteSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    deleteSpy = vi.fn().mockResolvedValue(undefined);
    vi.mocked(GatewayClient).mockImplementation(function () {
      return { delete: deleteSpy } as unknown as InstanceType<typeof GatewayClient>;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('constructs the client with the gateway and token', async () => {
    await deleteFromRegistry(baseOptions);

    expect(GatewayClient).toHaveBeenCalledWith({
      gateway: 'https://registry.example.com',
      token: 'test-token',
    });
  });

  it('issues a DELETE for the app id path', async () => {
    await deleteFromRegistry(baseOptions);

    expect(deleteSpy).toHaveBeenCalledWith('/api/v1/app/abc123');
  });

  it('wraps GatewayRequestError with an unpublish message', async () => {
    deleteSpy.mockRejectedValue(
      new GatewayRequestError(
        'DELETE https://registry.example.com/api/v1/app/abc123 failed: HTTP 500',
        {
          method: 'DELETE',
          url: 'https://registry.example.com/api/v1/app/abc123',
          status: 500,
        }
      )
    );

    await expect(deleteFromRegistry(baseOptions)).rejects.toThrow(
      'Failed to unpublish plugin: DELETE https://registry.example.com/api/v1/app/abc123 failed: HTTP 500'
    );
  });

  it('rethrows non-GatewayRequestError errors as-is', async () => {
    deleteSpy.mockRejectedValue(new Error('something else'));

    await expect(deleteFromRegistry(baseOptions)).rejects.toThrow('something else');
  });
});
