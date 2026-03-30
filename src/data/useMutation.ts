import { useState, useCallback } from 'react';
import { useDataContext } from './DataContext.js';

export interface MutationResult<T> {
  create: (input: Omit<T, 'id'>) => Promise<T>;
  update: (id: string, input: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<void>;
  loading: boolean;
  error: Error | null;
}

export function useMutation<T>(model: string): MutationResult<T> {
  const { resolver, invalidate } = useDataContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(
    async (input: Omit<T, 'id'>): Promise<T> => {
      setLoading(true);
      setError(null);
      try {
        const result = await resolver.create<T>(model, input);
        invalidate(model);
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [resolver, model, invalidate]
  );

  const update = useCallback(
    async (id: string, input: Partial<T>): Promise<T> => {
      setLoading(true);
      setError(null);
      try {
        const result = await resolver.update<T>(model, id, input);
        invalidate(model);
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [resolver, model, invalidate]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        await resolver.remove(model, id);
        invalidate(model);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [resolver, model, invalidate]
  );

  return { create, update, remove, loading, error };
}
