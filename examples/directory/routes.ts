import { route } from '@workday/everywhere';
import HomePage from './pages/Home.js';
import WorkerPage from './pages/Worker.js';

export const home = route('home', { component: HomePage });
export const worker = route<{ id: string }>('worker', { component: WorkerPage });
