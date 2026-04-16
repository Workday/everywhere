export function renderStub(name: string): string {
  return `import { plugin } from '@workday/everywhere';

function HomePage() {
  return (
    <div style={{ padding: 16 }}>
      <h1>Welcome to ${name}!</h1>
      <p>This is a simple plugin with a single page.</p>
    </div>
  );
}

export default plugin({
  pages: [{ id: 'home', title: 'Home', component: HomePage }],
});
`;
}
