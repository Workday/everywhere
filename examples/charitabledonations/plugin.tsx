import { type ReactNode } from 'react';
import { plugin, DataProvider, TridentResolver } from '@workday/everywhere';
import { CanvasProvider } from '@workday/canvas-kit-react';
import '@workday/canvas-tokens-web/css/base/_variables.css';
import '@workday/canvas-tokens-web/css/system/_variables.css';
import './styles.css';
import HomePage from './pages/Home.js';
import CharityListPage from './pages/CharityList.js';
import { schemas } from './everywhere/data/schema.js';

// TODO: replace with env var or proper service-account auth before shipping
const TRIDENT_ENDPOINT = 'https://api.us.wcp.workday.com/graphql/v5';
const BEARER_TOKEN =
  'eyJhbGciOiJSUzUxMiIsImtpZCI6IjIwMjYtMDQtMjQifQ.eyJpc3MiOiJDXHUwMDNkVVMsU1RcdTAwM2RDQSxMXHUwMDNkUGxlYXNhbnRvbixPVVx1MDAzZERldmVsb3BtZW50LE9cdTAwM2RXb3JrZGF5LENOXHUwMDNkT0NUT1BBQVMiLCJhdXRoX3RpbWUiOjE3NzcwNTU2OTksImF1dGhfdHlwZSI6IlBhYVMiLCJzeXNfYWNjdF90eXAiOiJOIiwic2NvcGUiOnsicmVnaW9uX2ZxZG4iOiJhcGkudXMud2NwLndvcmtkYXkuY29tIiwicmVnaW9uIjoic2N5bGxhOnVzIiwiY2xpZW50X2lkIjoiTUdWbFlXRXdZV1l0T0RSbE5pMDBObVE1TFdJMk56RXRNekZoWXpWak1tUTVaV1ZqIn0sInRva2VuVHlwZSI6IklkZW50aXR5Iiwic3ViIjoic21vcmdhbiIsImF1ZCI6IndkIiwiZXhwIjoxNzc3MDU5Mjk5LCJpYXQiOjE3NzcwNTU2OTksImp0aSI6IjVqeDlhandubTVoajhtYzVtamFkaDVwMTR3d2hmOThidzJmMm5ybTczaGtzYnhodWM0IiwidGVuYW50IjoiaGFjazEyMF93Y3BkZXYxIn0.ODzAr5VruxvHoKdM7qVi3MsVrfSk7Fkq8CrLYRYCxpEYMSrwTIEU2r_Nz8lWQX36I1srJJdAxDvQ80Wm3Rw3osNcwxeyztIHM7iLP2MQGVV_WLVh7K0wnYU3cQ76axX9JPK9d4p62i1E9IWTS-12I8rXY8mNLwsOfA1lm1Y2_MkZnLr2T8zkH0H0vx18jxK8asqisMkr9x1N7jpjx1pxL5oBgZ_fHBzkqi0d0KjD2dAalFTC5VUUeuc31EWD6eX0_f11gLBnXj3Is-oQd7zibtnuy7_Uh0__AORewSUchLRUNWS8UNHEwiqb4tivpwvUM-B6iyeSG7eBdc5yiFAjDw';

const resolver = new TridentResolver(
  TRIDENT_ENDPOINT,
  BEARER_TOKEN,
  'charitableDonations_mcwslt',
  schemas
);

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
