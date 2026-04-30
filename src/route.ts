import type { ComponentType } from 'react';

export interface RouteConfig {
  component: ComponentType;
}

export interface RouteDefinition<P extends Record<string, string> = Record<string, never>> {
  id: string;
  component: ComponentType;
  /** Phantom field — carries type info only, never set at runtime. */
  readonly _params?: P;
}

export function route<P extends Record<string, string> = Record<string, never>>(
  id: string,
  config: RouteConfig
): RouteDefinition<P> {
  return {
    id,
    component: config.component,
  };
}
