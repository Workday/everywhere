import { useState, useEffect, useCallback } from 'react';
import { useDataContext } from './DataContext.js';

export interface UseRequestOptions {
  skip?: boolean;
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

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!options.skip);
  const [error, setError] = useState<Error | null>(null);

  const skip = options.skip ?? false;

  const fetchData = useCallback(async () => {
    if (skip) return;
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
  }, [client, path, skip]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
