import { plugin, route } from '@workday/everywhere';
import logo from './dot.png';
function HomePage() {
  return <img src={logo} alt="" />;
}
const home = route('home', { component: HomePage });
export default plugin({ defaultRoute: home, routes: [home] });
