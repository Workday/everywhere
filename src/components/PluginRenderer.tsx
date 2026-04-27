import { NavigationProvider } from '../hooks/NavigationContext.js';
import { StyleBoundary } from './StyleBoundary.js';
import type { PluginDefinition } from '../types.js';

export interface PluginRendererProps {
  plugin: PluginDefinition;
  activeRouteId: string;
  onNavigate?: (routeId: string) => void;
}

export function PluginRenderer({ plugin, activeRouteId, onNavigate }: PluginRendererProps) {
  const activeRoute = plugin.routes.find((r) => r.id === activeRouteId);

  if (!activeRoute) {
    return <div style={{ padding: 16, color: '#888' }}>No route found</div>;
  }

  const ActiveComponent = activeRoute.component;

  return (
    <StyleBoundary provider={plugin.provider}>
      <NavigationProvider
        initialRouteId={activeRouteId}
        onNavigate={(routeId) => {
          if (plugin.routes.some((r) => r.id === routeId)) {
            onNavigate?.(routeId);
          }
        }}
      >
        <ActiveComponent />
      </NavigationProvider>
    </StyleBoundary>
  );
}
