// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { DataProvider } from '../../src/data/DataContext.js';
import { RestClient } from '../../src/data/RestClient.js';
import { useRequest } from '../../src/data/useRequest.js';
import { HttpClient } from '../../src/data/HttpClient.js';

function makeWrapper(client: RestClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <DataProvider client={client}>{children}</DataProvider>;
  };
}

function fakeRestClient(impl: () => Promise<unknown>): RestClient {
  const http = { request: vi.fn().mockImplementation(impl) } as unknown as HttpClient;
  return new RestClient(http);
}

describe('useRequest', () => {
  describe('lifecycle', () => {
    it('starts in loading state', () => {
      const client = fakeRestClient(() => new Promise(() => {}));
      const { result } = renderHook(() => useRequest('/x'), { wrapper: makeWrapper(client) });
      expect(result.current.loading).toBe(true);
    });

    it('populates data when the request resolves', async () => {
      const client = fakeRestClient(() => Promise.resolve({ name: 'Ada' }));
      const { result } = renderHook(() => useRequest<{ name: string }>('/x'), {
        wrapper: makeWrapper(client),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.data).toEqual({ name: 'Ada' });
    });

    it('populates error when the request rejects', async () => {
      const client = fakeRestClient(() => Promise.reject(new Error('boom')));
      const { result } = renderHook(() => useRequest('/x'), { wrapper: makeWrapper(client) });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error?.message).toBe('boom');
    });
  });

  describe('enabled', () => {
    it('does not fetch when enabled is false', async () => {
      const impl = vi.fn().mockResolvedValue({});
      const client = fakeRestClient(impl);
      renderHook(() => useRequest('/x', { enabled: false }), { wrapper: makeWrapper(client) });
      await new Promise((r) => setTimeout(r, 0));
      expect(impl).not.toHaveBeenCalled();
    });

    it('starts in non-loading state when enabled is false', () => {
      const client = fakeRestClient(() => new Promise(() => {}));
      const { result } = renderHook(() => useRequest('/x', { enabled: false }), {
        wrapper: makeWrapper(client),
      });
      expect(result.current.loading).toBe(false);
    });
  });

  describe('refetch', () => {
    it('issues a new request when refetch is called', async () => {
      const impl = vi.fn().mockResolvedValue({ n: 1 });
      const client = fakeRestClient(impl);
      const { result } = renderHook(() => useRequest('/x'), { wrapper: makeWrapper(client) });
      await waitFor(() => expect(result.current.loading).toBe(false));
      await act(async () => {
        await result.current.refetch();
      });
      expect(impl).toHaveBeenCalledTimes(2);
    });

    it('issues a request even when enabled is false', async () => {
      const impl = vi.fn().mockResolvedValue({ n: 1 });
      const client = fakeRestClient(impl);
      const { result } = renderHook(() => useRequest('/x', { enabled: false }), {
        wrapper: makeWrapper(client),
      });
      await act(async () => {
        await result.current.refetch();
      });
      expect(impl).toHaveBeenCalledTimes(1);
    });
  });

  describe('missing provider client', () => {
    it('throws a clear error if DataProvider has no client', () => {
      function Wrapper({ children }: { children: ReactNode }) {
        return <DataProvider>{children}</DataProvider>;
      }
      expect(() => renderHook(() => useRequest('/x'), { wrapper: Wrapper })).toThrow(/client/);
    });
  });
});
