import { useNavigationContext } from './NavigationContext.js';

export function useParams(): Record<string, string> {
  const { state } = useNavigationContext();
  return state.params;
}
