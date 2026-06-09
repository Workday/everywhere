import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, openAsBlob: vi.fn() };
});

vi.mock('../../src/gateway/client.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/gateway/client.js')>(
    '../../src/gateway/client.js'
  );
  return {
    ...actual,
    GatewayClient: vi.fn(),
  };
});

import { uploadToRegistry } from '../../src/registry/registry.js';
import { GatewayClient, GatewayRequestError } from '../../src/gateway/client.js';

describe('uploadToRegistry', () => {
  const baseOptions = {
    gateway: 'https://registry.example.com',
    token: 'test-token',
    archivePath: '/tmp/test-plugin.zip',
  };
  let requestSpy: ReturnType<typeof vi.fn>;
  let mockBlob: Blob;

  const successResponse = {
    tenant: 'acme',
    name: 'my-test-plugin',
    title: 'My Test Plugin',
    bundleUrl: '/api/v1/app/my-test-plugin/bundle.js',
  };

  beforeEach(() => {
    mockBlob = new Blob(['zip-content'], { type: 'application/zip' });
    (fs.openAsBlob as ReturnType<typeof vi.fn>).mockResolvedValue(mockBlob);
    requestSpy = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(successResponse), { status: 200 }));
    vi.mocked(GatewayClient).mockImplementation(function () {
      return { request: requestSpy } as unknown as InstanceType<typeof GatewayClient>;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('constructs the client with the gateway and token', async () => {
    await uploadToRegistry(baseOptions);

    expect(GatewayClient).toHaveBeenCalledWith(
      expect.objectContaining({
        gateway: 'https://registry.example.com',
        token: 'test-token',
      })
    );
  });

  it('forwards the provided logger to the GatewayClient constructor', async () => {
    const logger = { isVerbose: true, log: vi.fn() };

    await uploadToRegistry({ ...baseOptions, logger });

    expect(GatewayClient).toHaveBeenCalledWith({
      gateway: 'https://registry.example.com',
      token: 'test-token',
      logger,
    });
  });

  it('POSTs to /api/v1/apps/publish', async () => {
    await uploadToRegistry(baseOptions);

    expect(requestSpy).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', path: '/api/v1/apps/publish' })
    );
  });

  it('sets the Content-Type header to application/zip', async () => {
    await uploadToRegistry(baseOptions);

    expect(requestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/zip' }),
      })
    );
  });

  it('sends the archive blob as the request body', async () => {
    await uploadToRegistry(baseOptions);

    expect(requestSpy).toHaveBeenCalledWith(expect.objectContaining({ body: mockBlob }));
  });

  it('returns the validated registry upload result', async () => {
    const result = await uploadToRegistry(baseOptions);

    expect(result).toEqual(successResponse);
  });

  it('throws TypeError when the response json is null', async () => {
    requestSpy.mockResolvedValue(new Response('null', { status: 200 }));

    await expect(uploadToRegistry(baseOptions)).rejects.toThrow(TypeError);
  });

  it('throws TypeError when the response json is an array', async () => {
    requestSpy.mockResolvedValue(new Response('[]', { status: 200 }));

    await expect(uploadToRegistry(baseOptions)).rejects.toThrow(TypeError);
  });

  it('throws TypeError when a required string field is missing', async () => {
    requestSpy.mockResolvedValue(
      new Response(JSON.stringify({ tenant: 'acme', name: 'p', title: 't' }), { status: 200 })
    );

    await expect(uploadToRegistry(baseOptions)).rejects.toThrow(TypeError);
  });

  it('throws TypeError when a required field is not a string', async () => {
    requestSpy.mockResolvedValue(
      new Response(JSON.stringify({ tenant: 'acme', name: 'p', title: 't', bundleUrl: 123 }), {
        status: 200,
      })
    );

    await expect(uploadToRegistry(baseOptions)).rejects.toThrow(TypeError);
  });

  it('wraps GatewayRequestError with an upload message', async () => {
    requestSpy.mockRejectedValue(
      new GatewayRequestError(
        'POST https://registry.example.com/api/v1/apps/publish failed: HTTP 500',
        {
          method: 'POST',
          url: 'https://registry.example.com/api/v1/apps/publish',
          status: 500,
        }
      )
    );

    await expect(uploadToRegistry(baseOptions)).rejects.toThrow(
      'Failed to upload plugin: POST https://registry.example.com/api/v1/apps/publish failed: HTTP 500'
    );
  });

  it('rethrows non-GatewayRequestError errors as-is', async () => {
    requestSpy.mockRejectedValue(new Error('something else'));

    await expect(uploadToRegistry(baseOptions)).rejects.toThrow('something else');
  });
});
