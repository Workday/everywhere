import { route } from '@workday/everywhere';
import HomePage from './pages/Home.js';
import EmployeeListPage from './pages/EmployeeList.js';
import EmployeeDetail from './pages/EmployeeDetail.js';
import SpotlightPage from './pages/Spotlight.js';

export const home = route('home', { component: HomePage });
export const employees = route('employees', { component: EmployeeListPage });
export const employee = route<{ id: string }>('employee', { component: EmployeeDetail });
export const spotlight = route('spotlight', { component: SpotlightPage });
