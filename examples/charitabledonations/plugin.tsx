import { type ReactNode } from 'react';
import { plugin, DataProvider, HttpResolver } from '@workday/everywhere';
import { CanvasProvider } from '@workday/canvas-kit-react';
import '@workday/canvas-tokens-web/css/base/_variables.css';
import '@workday/canvas-tokens-web/css/system/_variables.css';
import './styles.css';
import HomePage from './pages/Home.js';
import CharityListPage from './pages/CharityList.js';

const resolver = new HttpResolver('/api/data');

function CharitiesProvider({ children }: { children: ReactNode }) {
  return (
    <CanvasProvider>
      <DataProvider resolver={resolver}>{children}</DataProvider>
    </CanvasProvider>
  );
}

export default plugin({
  provider: CharitiesProvider,
  pages: [
    { id: 'home', title: 'Home', component: HomePage },
    { id: 'charities', title: 'Charities', component: CharityListPage },
  ],
});
