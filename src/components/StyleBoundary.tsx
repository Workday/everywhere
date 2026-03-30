import type { ComponentType, ReactNode } from 'react';

export interface StyleBoundaryProps {
  children: ReactNode;
  provider?: ComponentType<{ children: ReactNode }>;
}

export function StyleBoundary({ children, provider: Provider }: StyleBoundaryProps) {
  const content = Provider ? <Provider>{children}</Provider> : children;
  return <div style={{ contain: 'style' }}>{content}</div>;
}
