import { type ReactNode } from 'react';
import { plugin, DataProvider, HttpResolver } from '@workday/everywhere';
import { CanvasProvider } from '@workday/canvas-kit-react';
import '@workday/canvas-tokens-web/css/base/_variables.css';
import '@workday/canvas-tokens-web/css/system/_variables.css';
import './styles.css';
import { home, employees, employee, spotlight } from './routes.js';

const resolver = new HttpResolver('/api/data');

function DirectoryProvider({ children }: { children: ReactNode }) {
  return (
    <CanvasProvider>
      <DataProvider resolver={resolver}>{children}</DataProvider>
    </CanvasProvider>
  );
}

export default plugin({
  provider: DirectoryProvider,
  defaultRoute: home,
  routes: [home, employees, employee, spotlight],
});
