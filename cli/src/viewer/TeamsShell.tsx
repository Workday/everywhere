import { useState } from 'react';
import type { PluginDefinition } from '../../../dist/index.js';
import { PluginRenderer } from '../../../dist/components/index.js';

interface TeamsShellProps {
  plugin: PluginDefinition;
  name: string;
  version: string;
}

export function TeamsShell({ plugin, name, version }: TeamsShellProps) {
  const [activeRouteId, setActiveRouteId] = useState(
    plugin.defaultRoute?.id ?? plugin.routes[0]?.id ?? ''
  );

  if (plugin.routes.length === 0) {
    return (
      <div className="viewer-shell">
        <header className="viewer-header">
          <span className="viewer-header-name">{name}</span>
          <span className="viewer-header-version">v{version}</span>
        </header>
        <div className="viewer-empty">No routes defined in this plugin.</div>
      </div>
    );
  }

  return (
    <div className="viewer-shell">
      <header className="viewer-header">
        <span className="viewer-header-name">{name}</span>
        <span className="viewer-header-version">v{version}</span>
        <nav className="viewer-tabs">
          {plugin.routes.map((r) => (
            <button
              key={r.id}
              className="viewer-tab"
              data-active={activeRouteId === r.id}
              onClick={() => setActiveRouteId(r.id)}
            >
              {r.id}
            </button>
          ))}
        </nav>
      </header>
      <main className="viewer-content">
        <PluginRenderer
          plugin={plugin}
          activeRouteId={activeRouteId}
          onNavigate={setActiveRouteId}
        />
      </main>
    </div>
  );
}
