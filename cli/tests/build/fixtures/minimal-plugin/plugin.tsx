import { plugin, route } from '@workday/everywhere';

function HomePage() {
  return <h1>Hello</h1>;
}

const home = route('home', { component: HomePage });

export default plugin({
  defaultRoute: home,
  routes: [home],
});
