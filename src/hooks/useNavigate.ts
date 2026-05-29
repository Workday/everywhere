import type { RouteDefinition } from '../route.js';
import { useNavigationContext } from './NavigationContext.js';

type NavigateFn = <P extends Record<string, string>>(
  route: RouteDefinition<P>,
  ...args: P extends Record<string, never> ? [] : [params: P]
) => void;

export function useNavigate(): NavigateFn {
  const { navigate } = useNavigationContext();
  return navigate as NavigateFn;
}
