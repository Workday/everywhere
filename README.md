# Workday Everywhere SDK

Core libraries and framework for building Workday Everywhere platform integrations.

## Quick Start

```sh
mkdir my-plugin && cd my-plugin
npm init -y
npx @workday/everywhere init
npx @workday/everywhere view
```

This creates a new plugin project, scaffolds a starter `plugin.tsx`, installs dependencies, and
opens a local dev preview at http://localhost:4242 with hot reloading.

## Getting Started

### 1. Create a plugin

Create a new directory for your Workday Everywhere plugin and scaffold it with the CLI:

```sh
mkdir my-plugin && cd my-plugin
npm init -y
npx @workday/everywhere init
```

The `init` command adds `@workday/everywhere`, `react`, and `react-dom` to your `package.json`,
creates a starter `plugin.tsx`, and runs `npm install` automatically.

The generated `plugin.tsx` defines your plugin's routes:

```tsx
import { plugin, route } from '@workday/everywhere';

function HomePage() {
  return (
    <div style={{ padding: 16 }}>
      <h1>Welcome to my-plugin!</h1>
      <p>This is a simple plugin with a single page.</p>
    </div>
  );
}

const home = route('home', { component: HomePage });

export default plugin({
  defaultRoute: home,
  routes: [home],
});
```

Each route has an `id` and a React `component`. The `defaultRoute` is what loads when the plugin
first opens. Add more routes and use `useNavigate()` to navigate between them.

### 2. Preview

Launch the local dev server to preview your plugin in the browser:

```sh
npx @workday/everywhere view
```

This starts a Vite dev server at http://localhost:4242 with hot reloading.

### 3. Build

Package your plugin into a distributable zip file:

```sh
npx everywhere build
```

This produces a `dist/<name>-<version>.zip` containing `package.json` and the bundled `plugin.js`.

## CLI Reference

All commands accept `-D <path>` to specify the plugin directory (defaults to the current working
directory).

| Command              | Description                                        |
| -------------------- | -------------------------------------------------- |
| `everywhere init`    | Scaffold a new plugin in an existing project       |
| `everywhere view`    | Preview a plugin in the browser                    |
| `everywhere build`   | Bundle and package a plugin into a zip file        |
| `everywhere publish` | Build and publish a plugin to the Workday registry |
| `everywhere install` | Build and install a plugin to a local directory    |
| `everywhere info`    | Show plugin details from package.json              |
| `everywhere bind`    | Generate TypeScript types from Extend models       |
| `everywhere auth`    | Manage authentication with Workday servers         |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.
