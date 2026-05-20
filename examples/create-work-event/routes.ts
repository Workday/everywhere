import { route } from '@workday/everywhere';
import HomePage from './pages/Home.js';
import BrowseEventsPage from './pages/BrowseEvents.js';
import EventDetailPage from './pages/EventDetail.js';
import MyEventsPage from './pages/MyEvents.js';
import CreateEventPage from './pages/CreateEvent.js';
import ManageEventsPage from './pages/ManageEvents.js';

export const home = route('home', { component: HomePage });
export const browseEvents = route<{ type?: string }>('browse', { component: BrowseEventsPage });
export const eventDetail = route<{ id: string }>('event', { component: EventDetailPage });
export const myEvents = route('my-events', { component: MyEventsPage });
export const createEvent = route('create', { component: CreateEventPage });
export const manageEvents = route('manage', { component: ManageEventsPage });
