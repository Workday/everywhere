import { useState } from 'react';
import { PluginRenderer } from '../components/PluginRenderer.js';
import type { PluginDefinition } from '../types.js';

interface TeamsShellProps {
  plugin: PluginDefinition;
  name: string;
  version: string;
}

export function TeamsShell({ plugin, name, version }: TeamsShellProps) {
  const [routeId, setRouteId] = useState(plugin.defaultRoute?.id ?? plugin.routes[0]?.id ?? '');
  const [params, setParams] = useState<Record<string, string>>({});

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
              data-active={routeId === r.id}
              onClick={() => {
                setRouteId(r.id);
                setParams({});
              }}
            >
              {r.id}
            </button>
          ))}
        </nav>
      </header>
      <main className="viewer-content">
        <PluginRenderer
          plugin={plugin}
          routeId={routeId}
          params={params}
          onNavigate={(id, p) => {
            setRouteId(id);
            setParams(p);
          }}
        />
      </main>
    </div>
  );
}
