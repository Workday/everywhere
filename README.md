# Workday Everywhere SDK

Core libraries and framework for building Workday Everywhere platform integrations.

## Getting Started

### 1. Create a plugin

Create a new directory for your Workday Everywhere plugin and install the SDK:

```sh
mkdir my-plugin && cd my-plugin
npm init -y
npm install @workday/everywhere react react-dom
```

Add your plugin metadata to `package.json`:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "My first Workday Everywhere plugin."
}
```

Define your plugin in a `plugin.tsx` file:

```tsx
import React from 'react';
import { plugin } from '@workday/everywhere';

function HomePage() {
  return <h1>Hello, Workday Everywhere!</h1>;
}

export default plugin({
  pages: [{ id: 'home', title: 'Home', component: HomePage }],
});
```

### 2. Preview

Launch the local dev server to preview your plugin in the browser:

```sh
npx everywhere view
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

| Command            | Description                                  |
| ------------------ | -------------------------------------------- |
| `everywhere view`  | Preview a plugin in the browser              |
| `everywhere build` | Bundle and package a plugin into a zip file  |
| `everywhere info`  | Show plugin details from package.json        |
| `everywhere bind`  | Generate TypeScript types from Extend models |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.
