import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import { uploadToRegistry } from '../../src/registry/registry.js';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, openAsBlob: vi.fn() };
});

describe('uploadToRegistry', () => {
  const baseOptions = {
    gateway: 'registry.example.com',
    httpsEnabled: false,
    token: 'test-token',
    archivePath: '/tmp/test-plugin.zip',
    appRefId: 'my-test-plugin',
  };

  beforeEach(() => {
    (fs.openAsBlob as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Blob(['zip-content'], { type: 'application/zip' })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('when the upload succeeds', () => {
    const successResponse = {
      id: 'abc123',
      referenceId: 'ref-456',
      status: 'published',
      appType: 'plugin',
      creator: 'user@example.com',
    };

    beforeEach(() => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(successResponse),
        })
      );
    });

    it('returns the validated registry upload result', async () => {
      const result = await uploadToRegistry(baseOptions);
      expect(result).toEqual(successResponse);
    });

    it('posts to the http registry URL when httpsEnabled is false', async () => {
      await uploadToRegistry({ ...baseOptions, httpsEnabled: false });
      expect(fetch).toHaveBeenCalledWith(
        new URL('http://registry.example.com/builder/v1/apps/source/archive'),
        expect.anything()
      );
    });

    it('posts to the https registry URL when httpsEnabled is true', async () => {
      await uploadToRegistry({ ...baseOptions, httpsEnabled: true });
      expect(fetch).toHaveBeenCalledWith(
        new URL('https://registry.example.com/builder/v1/apps/source/archive'),
        expect.anything()
      );
    });

    it('includes the authorization bearer token in the request header', async () => {
      await uploadToRegistry(baseOptions);
      expect(fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token' },
        })
      );
    });

    it('includes the appRefId in the upload form', async () => {
      await uploadToRegistry(baseOptions);
      const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
      const lastCall = calls[calls.length - 1];
      if (!lastCall) throw new Error('No fetch calls made');
      const [, options] = lastCall;
      expect((options.body as FormData).get('appRefId')).toBe('my-test-plugin');
    });

    it('includes the archive as a File in the upload form payload field', async () => {
      await uploadToRegistry(baseOptions);
      const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
      const lastCall = calls[calls.length - 1];
      if (!lastCall) throw new Error('No fetch calls made');
      const [, options] = lastCall;
      expect((options.body as FormData).get('payload')).toBeInstanceOf(File);
    });

    it('uses the archive filename for the uploaded file', async () => {
      await uploadToRegistry(baseOptions);
      const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
      const lastCall = calls[calls.length - 1];
      if (!lastCall) throw new Error('No fetch calls made');
      const [, options] = lastCall;
      const payload = (options.body as FormData).get('payload') as File;
      expect(payload.name).toBe('test-plugin.zip');
    });
  });

  describe('when the upload succeeds but the response body is not a valid registry result object', () => {
    it('throws TypeError when the response json is null', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(null),
        })
      );

      await expect(uploadToRegistry(baseOptions)).rejects.toThrow(TypeError);
    });

    it('throws TypeError when the response json is an array', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve([]),
        })
      );

      await expect(uploadToRegistry(baseOptions)).rejects.toThrow(TypeError);
    });

    it('throws TypeError when a required string field is missing', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'abc123',
              referenceId: 'ref-456',
              status: 'published',
              appType: 'plugin',
            }),
        })
      );

      await expect(uploadToRegistry(baseOptions)).rejects.toThrow(TypeError);
    });

    it('throws TypeError when a required field is not a string', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'abc123',
              referenceId: 'ref-456',
              status: 'published',
              appType: 'plugin',
              creator: 123,
            }),
        })
      );

      await expect(uploadToRegistry(baseOptions)).rejects.toThrow(TypeError);
    });
  });

  describe('when the server returns a non-OK response', () => {
    it('throws with an upload error message', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          json: () => Promise.resolve({ error: 'Upload failed' }),
        })
      );

      await expect(uploadToRegistry(baseOptions)).rejects.toThrow(
        'There was an error uploading your plugin to the registry'
      );
    });
  });

  describe('when the network request fails', () => {
    it('throws with a failure message that includes the cause', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')));

      await expect(uploadToRegistry(baseOptions)).rejects.toThrow(
        'Failed to upload plugin: connection refused'
      );
    });
  });
});
