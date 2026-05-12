import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteFromRegistry } from '../../src/registry/registry.js';

describe('deleteFromRegistry', () => {
  const baseOptions = {
    gateway: 'registry.example.com',
    httpsEnabled: false,
    token: 'test-token',
    appId: 'abc123',
  };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('when the delete succeeds', () => {
    beforeEach(() => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
        })
      );
    });

    it('sends a DELETE request to the http app endpoint when httpsEnabled is false', async () => {
      await deleteFromRegistry(baseOptions);
      expect(fetch).toHaveBeenCalledWith(
        new URL('http://registry.example.com/api/v1/app/abc123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('sends a DELETE request to the https app endpoint when httpsEnabled is true', async () => {
      await deleteFromRegistry({ ...baseOptions, httpsEnabled: true });
      expect(fetch).toHaveBeenCalledWith(
        new URL('https://registry.example.com/api/v1/app/abc123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('includes the authorization bearer token in the request header', async () => {
      await deleteFromRegistry(baseOptions);
      expect(fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token' },
        })
      );
    });
  });

  describe('when the server returns a non-OK response', () => {
    it('throws with a delete error message', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
        })
      );

      await expect(deleteFromRegistry(baseOptions)).rejects.toThrow(
        'There was an error unpublishing your plugin from the registry'
      );
    });
  });

  describe('when the network request fails', () => {
    it('throws with a failure message that includes the cause', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')));

      await expect(deleteFromRegistry(baseOptions)).rejects.toThrow(
        'Failed to unpublish plugin: connection refused'
      );
    });
  });
});
