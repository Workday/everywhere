import { useMemo } from 'react';
import { NavigationContext, type NavigationContextValue } from '../hooks/NavigationContext.js';
import { StyleBoundary } from './StyleBoundary.js';
import type { PluginDefinition } from '../types.js';

export interface PluginRendererProps {
  plugin: PluginDefinition;
  routeId: string;
  params: Record<string, string>;
  onNavigate: (routeId: string, params: Record<string, string>) => void;
}

export function PluginRenderer({ plugin, routeId, params, onNavigate }: PluginRendererProps) {
  const activeRoute = plugin.routes.find((r) => r.id === routeId);

  const contextValue = useMemo<NavigationContextValue>(
    () => ({
      state: { routeId, params },
      navigate: (route, p) => {
        if (plugin.routes.some((r) => r.id === route.id)) {
          onNavigate(route.id, p ?? {});
        }
      },
    }),
    [plugin, routeId, params, onNavigate]
  );

  if (!activeRoute) {
    return <div style={{ padding: 16, color: '#888' }}>No route found</div>;
  }

  const ActiveComponent = activeRoute.component;

  return (
    <StyleBoundary provider={plugin.provider}>
      <NavigationContext.Provider value={contextValue}>
        <ActiveComponent />
      </NavigationContext.Provider>
    </StyleBoundary>
  );
}
