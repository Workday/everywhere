import { type ReactNode } from 'react';
import { plugin, DataProvider, GraphQLResolver } from '@workday/everywhere';
import { CanvasProvider } from '@workday/canvas-kit-react';
import { schemas } from './everywhere/data/schema.js';
import { REFERENCE_ID } from './everywhere/extend.js';
import { home, charityDetail } from './routes.js';

const resolver = new GraphQLResolver(REFERENCE_ID, schemas);

function AppProvider({ children }: { children: ReactNode }) {
  return (
    <CanvasProvider>
      <DataProvider resolver={resolver}>{children}</DataProvider>
    </CanvasProvider>
  );
}

export default plugin({
  provider: AppProvider,
  defaultRoute: home,
  routes: [home, charityDetail],
});
