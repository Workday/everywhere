import { plugin } from '@workday/everywhere';

function HomePage() {
  return <h1>Hello</h1>;
}

export default plugin({
  pages: [{ id: 'home', title: 'Home', component: HomePage }],
});
