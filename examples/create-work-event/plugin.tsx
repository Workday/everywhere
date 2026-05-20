import { type ReactNode } from 'react';
import { plugin, DataProvider, GraphQLResolver } from '@workday/everywhere';
import { home, browseEvents, eventDetail, myEvents, createEvent, manageEvents } from './routes.js';
import { schemas } from './everywhere/data/schema.js';

const resolver = new GraphQLResolver('createAWorkEventNjjhnta_wtmhcd', schemas);

function WorkEventProvider({ children }: { children: ReactNode }) {
  return <DataProvider resolver={resolver}>{children}</DataProvider>;
}

export default plugin({
  provider: WorkEventProvider,
  defaultRoute: home,
  routes: [home, browseEvents, eventDetail, myEvents, createEvent, manageEvents],
});
