import { createRoot } from 'react-dom/client';
import { TeamsShell } from './TeamsShell.js';
import type { PluginDefinition } from '../types.js';
import './viewer.css';

// Resolved via Vite aliases to the developer's plugin files.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — virtual module resolved at runtime by Vite
import pluginDef from 'virtual:plugin-entry';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — virtual module resolved at runtime by Vite
import pkg from 'virtual:plugin-package';

const plugin = pluginDef as PluginDefinition;

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<TeamsShell plugin={plugin} name={pkg.name} version={pkg.version} />);
}
