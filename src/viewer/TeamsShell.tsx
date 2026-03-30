import { useState } from 'react';
import { PluginRenderer } from '../components/index.js';
import type { PluginDefinition } from '../types.js';

interface TeamsShellProps {
  plugin: PluginDefinition;
  name: string;
  version: string;
}

export function TeamsShell({ plugin, name, version }: TeamsShellProps) {
  const [activePageId, setActivePageId] = useState(plugin.pages[0]?.id ?? '');

  if (plugin.pages.length === 0) {
    return (
      <div className="viewer-shell">
        <header className="viewer-header">
          <span className="viewer-header-name">{name}</span>
          <span className="viewer-header-version">v{version}</span>
        </header>
        <div className="viewer-empty">No pages defined in this plugin.</div>
      </div>
    );
  }

  return (
    <div className="viewer-shell">
      <header className="viewer-header">
        <span className="viewer-header-name">{name}</span>
        <span className="viewer-header-version">v{version}</span>
        <nav className="viewer-tabs">
          {plugin.pages.map((page) => (
            <button
              key={page.id}
              className="viewer-tab"
              data-active={activePageId === page.id}
              onClick={() => setActivePageId(page.id)}
            >
              {page.title}
            </button>
          ))}
        </nav>
      </header>
      <main className="viewer-content">
        <PluginRenderer plugin={plugin} activePageId={activePageId} onNavigate={setActivePageId} />
      </main>
    </div>
  );
}
