import { createContext, type ReactNode, useContext, useState } from 'react';
import type { RouteDefinition } from '../route.js';

export interface NavigationState {
  routeId: string;
  params: Record<string, string>;
}

interface NavigationContextValue {
  state: NavigationState;
  navigate: (route: RouteDefinition<any>, params?: Record<string, string>) => void;
}

const NavigationContext = createContext<NavigationContextValue>({
  state: { routeId: '', params: {} },
  navigate: () => {},
});

export interface NavigationProviderProps {
  initialRouteId?: string;
  onNavigate?: (routeId: string, params?: Record<string, string>) => void;
  children: ReactNode;
}

export function NavigationProvider({
  initialRouteId = '',
  onNavigate,
  children,
}: NavigationProviderProps) {
  const [state, setState] = useState<NavigationState>({
    routeId: initialRouteId,
    params: {},
  });

  const navigate = (route: RouteDefinition<any>, params?: Record<string, string>) => {
    setState({ routeId: route.id, params: params ?? {} });
    onNavigate?.(route.id, params);
  };

  return (
    <NavigationContext.Provider value={{ state, navigate }}>{children}</NavigationContext.Provider>
  );
}

export function useNavigationContext(): NavigationContextValue {
  return useContext(NavigationContext);
}
