import { useState, useEffect, useCallback } from 'react';
import { useDataContext } from './DataContext.js';

export interface UseRequestOptions {
  enabled?: boolean;
}

export interface RequestResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useRequest<T>(path: string, options: UseRequestOptions = {}): RequestResult<T> {
  const { client } = useDataContext();
  if (!client) {
    throw new Error('useRequest requires a `client` on DataProvider');
  }

  const enabled = options.enabled ?? true;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  // refetch always issues a request, regardless of `enabled`.
  // `enabled` only controls whether the request fires automatically on mount/path-change.
  const refetch = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const result = await client.get<T>(path);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [client, path]);

  useEffect(() => {
    if (!enabled) return;
    void refetch();
  }, [enabled, refetch]);

  return { data, loading, error, refetch };
}
