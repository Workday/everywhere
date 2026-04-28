import { NavigationProvider } from '../hooks/index.js';
import { StyleBoundary } from './StyleBoundary.js';
import type { PluginDefinition } from '../types.js';

export interface PluginRendererProps {
  plugin: PluginDefinition;
  activePageId: string;
  onNavigate?: (pageId: string) => void;
}

export function PluginRenderer({ plugin, activePageId, onNavigate }: PluginRendererProps) {
  const activePage = plugin.pages.find((p) => p.id === activePageId);

  if (!activePage) {
    return <div style={{ padding: 16, color: '#888' }}>No page found</div>;
  }

  const ActivePageComponent = activePage.component;

  return (
    <StyleBoundary provider={plugin.provider}>
      <NavigationProvider
        initialView={activePageId}
        onNavigate={(view) => {
          if (plugin.pages.some((p) => p.id === view)) {
            onNavigate?.(view);
          }
        }}
      >
        <ActivePageComponent />
      </NavigationProvider>
    </StyleBoundary>
  );
}
