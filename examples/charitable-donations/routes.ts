import { route } from '@workday/everywhere';
import HomePage from './pages/Home.js';
import CharityDetailPage from './pages/CharityDetail.js';

export const home = route('home', { component: HomePage });
export const charityDetail = route<{ id: string }>('charity', { component: CharityDetailPage });
