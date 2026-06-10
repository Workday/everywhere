import { type ReactNode } from 'react';
import { plugin, DataProvider, RestClient } from '@workday/everywhere';
import { CanvasProvider } from '@workday/canvas-kit-react';
import { home, worker } from './routes.js';

const client = new RestClient('/api/v1/tenant');

function DirectoryProvider({ children }: { children: ReactNode }) {
  return (
    <CanvasProvider>
      <DataProvider client={client}>{children}</DataProvider>
    </CanvasProvider>
  );
}

export default plugin({
  provider: DirectoryProvider,
  defaultRoute: home,
  routes: [home, worker],
});
