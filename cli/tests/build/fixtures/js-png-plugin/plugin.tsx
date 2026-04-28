import { plugin } from '@workday/everywhere';
import logo from './dot.png';
function HomePage() {
  return <img src={logo} alt="" />;
}
export default plugin({ pages: [{ id: 'home', title: 'Home', component: HomePage }] });
