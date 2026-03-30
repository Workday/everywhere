import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';
import type { DataResolver } from './resolver.js';

interface DataContextValue {
  resolver: DataResolver;
  invalidationKey: number;
  invalidate: (model: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export interface DataProviderProps {
  resolver: DataResolver;
  children: ReactNode;
}

export function DataProvider({ resolver, children }: DataProviderProps) {
  const [invalidationKey, setInvalidationKey] = useState(0);

  const invalidate = useCallback((_model: string) => {
    setInvalidationKey((k) => k + 1);
  }, []);

  return (
    <DataContext.Provider value={{ resolver, invalidationKey, invalidate }}>
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
