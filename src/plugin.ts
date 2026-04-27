import type { PluginConfig, PluginDefinition } from './types.js';

export function plugin(config?: PluginConfig): PluginDefinition {
  return {
    routes: config?.routes ?? [],
    defaultRoute: config?.defaultRoute,
    provider: config?.provider,
  };
}
