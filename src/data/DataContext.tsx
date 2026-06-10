import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';
import type { DataResolver } from './resolver.js';
import type { RestClient } from './RestClient.js';

interface DataContextValue {
  resolver: DataResolver | null;
  client: RestClient | null;
  invalidationKey: number;
  invalidate: (model: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export interface DataProviderProps {
  resolver?: DataResolver;
  client?: RestClient;
  children: ReactNode;
}

export function DataProvider({ resolver, client, children }: DataProviderProps) {
  const [invalidationKey, setInvalidationKey] = useState(0);

  const invalidate = useCallback((_model: string) => {
    setInvalidationKey((k) => k + 1);
  }, []);

  return (
    <DataContext.Provider
      value={{
        resolver: resolver ?? null,
        client: client ?? null,
        invalidationKey,
        invalidate,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useDataContext(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
}
