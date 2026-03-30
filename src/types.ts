import type { ComponentType, ReactNode } from 'react';

export interface PageConfig {
  id: string;
  title: string;
  component: ComponentType;
}

export interface PluginConfig {
  pages?: PageConfig[];
  provider?: ComponentType<{ children: ReactNode }>;
}

export interface PluginDefinition {
  pages: PageConfig[];
  provider?: ComponentType<{ children: ReactNode }>;
}
