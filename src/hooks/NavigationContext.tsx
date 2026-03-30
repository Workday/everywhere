import { createContext, type ReactNode, useContext, useState } from 'react';

export interface NavigationState {
  view: string;
  params: Record<string, string>;
}

export interface NavigationContextValue {
  state: NavigationState;
  navigate: (view: string, params?: Record<string, string>) => void;
}

const NavigationContext = createContext<NavigationContextValue>({
  state: { view: '', params: {} },
  navigate: () => {},
});

export interface NavigationProviderProps {
  initialView?: string;
  initialParams?: Record<string, string>;
  onNavigate?: (view: string, params?: Record<string, string>) => void;
  children: ReactNode;
}

export function NavigationProvider({
  initialView = '',
  initialParams = {},
  onNavigate,
  children,
}: NavigationProviderProps) {
  const [state, setState] = useState<NavigationState>({
    view: initialView,
    params: initialParams,
  });

  const navigate = (view: string, params?: Record<string, string>) => {
    setState({ view, params: params ?? {} });
    onNavigate?.(view, params);
  };

  return (
    <NavigationContext.Provider value={{ state, navigate }}>{children}</NavigationContext.Provider>
  );
}

export function useNavigationContext(): NavigationContextValue {
  return useContext(NavigationContext);
}
