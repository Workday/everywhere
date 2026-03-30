import { type ReactNode } from 'react';
import { plugin, DataProvider, HttpResolver } from '@workday/everywhere';
import { CanvasProvider } from '@workday/canvas-kit-react';
import '@workday/canvas-tokens-web/css/base/_variables.css';
import '@workday/canvas-tokens-web/css/system/_variables.css';
import './styles.css';
import HomePage from './pages/Home.js';
import EmployeeListPage from './pages/EmployeeList.js';
import SpotlightPage from './pages/Spotlight.js';

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
  pages: [
    { id: 'home', title: 'Home', component: HomePage },
    { id: 'employees', title: 'Employees', component: EmployeeListPage },
    { id: 'spotlight', title: 'Spotlight', component: SpotlightPage },
  ],
});
