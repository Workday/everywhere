import type { RouteDefinition } from '../route.js';
import { useNavigationContext } from './NavigationContext.js';

export function useParams<P extends Record<string, string>>(_route: RouteDefinition<P>): P {
  const { state } = useNavigationContext();
  return state.params as P;
}
