import { createContext, useContext } from 'react';
import type { RouteDefinition } from '../route.js';

export interface NavigationState {
  routeId: string;
  params: Record<string, string>;
}

export interface NavigationContextValue {
  state: NavigationState;
  navigate: (route: RouteDefinition<any>, params?: Record<string, string>) => void;
}

export const NavigationContext = createContext<NavigationContextValue>({
  state: { routeId: '', params: {} },
  navigate: () => {},
});

export function useNavigationContext(): NavigationContextValue {
  return useContext(NavigationContext);
}
