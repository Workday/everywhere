import type { PluginConfig, PluginDefinition } from './types.js';

export function plugin(config: PluginConfig): PluginDefinition {
  return {
    name: config.name,
    version: config.version,
    description: config.description,
  };
}
