import { plugin, route } from '@workday/everywhere';

function HomePage() {
  return (
    <div style={{ padding: 16 }}>
      <h1>Hello, Workday Everywhere!</h1>
      <p>This is a simple plugin with a single page.</p>
    </div>
  );
}

const home = route('home', { component: HomePage });

export default plugin({
  defaultRoute: home,
  routes: [home],
});
