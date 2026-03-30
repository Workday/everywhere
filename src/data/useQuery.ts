import { useState, useEffect, useCallback } from 'react';
import { useDataContext } from './DataContext.js';

export interface QueryOptions {
  id?: string;
  filter?: Record<string, unknown>;
  enabled?: boolean;
}

export interface QueryResult<T> {
  data: T[] | T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useQuery<T>(model: string, options?: QueryOptions): QueryResult<T> {
  const { resolver, invalidationKey } = useDataContext();
  const [data, setData] = useState<T[] | T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const enabled = options?.enabled ?? true;
  const id = options?.id;
  const filterJson = options?.filter ? JSON.stringify(options.filter) : undefined;

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      if (id) {
        const result = await resolver.findOne<T>(model, id);
        setData(result);
      } else {
        const filter = filterJson ? (JSON.parse(filterJson) as Record<string, unknown>) : undefined;
        const result = await resolver.find<T>(model, filter);
        setData(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [resolver, model, id, filterJson, enabled, invalidationKey]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
