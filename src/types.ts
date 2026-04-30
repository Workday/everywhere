import type { ComponentType, ReactNode } from 'react';
import type { RouteDefinition } from './route.js';

export type { RouteConfig, RouteDefinition } from './route.js';

export interface PluginConfig {
  routes?: RouteDefinition<Record<string, string>>[];
  defaultRoute?: RouteDefinition<Record<string, never>>;
  provider?: ComponentType<{ children: ReactNode }>;
}

export interface PluginDefinition {
  routes: RouteDefinition<Record<string, string>>[];
  defaultRoute: RouteDefinition<Record<string, never>> | undefined;
  provider?: ComponentType<{ children: ReactNode }>;
}
