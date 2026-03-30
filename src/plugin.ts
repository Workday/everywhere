import type { PluginConfig, PluginDefinition } from './types.js';

export function plugin(config?: PluginConfig): PluginDefinition {
  return { ...config };
}
