import { useNavigationContext } from './NavigationContext.js';

export function useNavigate(): (view: string, params?: Record<string, string>) => void {
  const { navigate } = useNavigationContext();
  return navigate;
}
