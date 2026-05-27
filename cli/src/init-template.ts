export function renderTsConfig(): string {
  const config = {
    compilerOptions: {
      target: 'ES2020',
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      jsx: 'react-jsx',
      module: 'Preserve',
      moduleResolution: 'bundler',
      strict: true,
      noEmit: true,
      skipLibCheck: true,
    },
    include: ['**/*.ts', '**/*.tsx'],
    exclude: ['node_modules', 'dist'],
  };
  return JSON.stringify(config, null, 2) + '\n';
}

export function renderStub(name: string): string {
  return `import { plugin, route } from '@workday/everywhere';

function HomePage() {
  return (
    <div style={{ padding: 16 }}>
      <h1>Welcome to ${name}!</h1>
      <p>This is a simple plugin with a single page.</p>
    </div>
  );
}

const home = route('home', { component: HomePage });

export default plugin({
  defaultRoute: home,
  routes: [home],
});
`;
}
