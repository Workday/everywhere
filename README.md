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

The generated `plugin.tsx` defines your plugin's pages:

```tsx
import { plugin } from '@workday/everywhere';

function HomePage() {
  return (
    <div style={{ padding: 16 }}>
      <h1>Welcome to my-plugin!</h1>
      <p>This is a simple plugin with a single page.</p>
    </div>
  );
}

export default plugin({
  pages: [{ id: 'home', title: 'Home', component: HomePage }],
});
```

Each page has an `id`, `title`, and React `component`. Add more pages to the `pages` array to create
multi-page plugins.

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

This produces a `dist/<name>-<version>.zip` containing `package.json`, the bundled `plugin.js`, and
when present `plugin.css` plus any hashed static assets under `assets/`.

## Connecting to Workday Data

Plugins can connect directly to Workday's Trident GraphQL API to read and write data from Extend
business objects.

### 1. Log in

Authenticate with your Workday tenant once. This stores your credentials locally so you never need
to paste tokens into plugin code:

```sh
npx @workday/everywhere auth login
```

You will be prompted to enter your API gateway hostname and paste an access token. Credentials are
saved to `~/.config/@workday/everywhere/config.json` and injected automatically by
`everywhere view`.

To check your current login status:

```sh
npx @workday/everywhere auth status
```

### 2. Generate types from your bundle

Point `everywhere bind` at your downloaded Extend bundle directory (the folder containing the
`model/` subfolder):

```sh
npx @workday/everywhere bind /path/to/your-bundle
```

This reads all `.businessobject` and `.attachment` model files and generates into
`everywhere/data/`:

- **`models.ts`** — TypeScript interfaces for each model
- **`schema.ts`** — Runtime schema used by `TridentResolver` to build GraphQL queries
- **`<ModelName>.ts`** — `useModelName()`, `useModelName(id)`, and `useModelNameMutation()` hooks

Generated types reflect the full model: scalar fields, `SINGLE_INSTANCE` / `MULTI_INSTANCE`
references, derived fields (marked `readonly`), and `CurrencyValue` for `CURRENCY` fields.

> **Note:** Run `bind` again whenever you update the bundle. The output directory is saved so you
> can re-run with just `npx @workday/everywhere bind`.

### 3. Add `TridentResolver` to your plugin

`TridentResolver` translates hook calls into Trident GraphQL requests. During local development it
routes requests through the `everywhere view` dev server, which injects your stored credentials
automatically — no tokens in source code.

```tsx
import { plugin, DataProvider, TridentResolver } from '@workday/everywhere';
import { schemas } from './everywhere/data/schema.js';

// referenceId comes from appManifest.json in your Extend bundle.
const resolver = new TridentResolver('your-app-referenceId', schemas);

function AppProvider({ children }) {
  return <DataProvider resolver={resolver}>{children}</DataProvider>;
}

export default plugin({
  provider: AppProvider,
  pages: [ ... ],
});
```

The resolver defaults to `/_we/trident`, which `everywhere view` proxies to your configured gateway
with your stored token. For production deployments or direct calls, pass an explicit endpoint and
token via `options`:

```tsx
const resolver = new TridentResolver('your-app-referenceId', schemas, {
  endpoint: 'https://api.us.wcp.workday.com/graphql/v5',
  bearerToken: process.env.TRIDENT_TOKEN,
});
```

> **Token expiry:** If a request fails due to an expired token, re-run `everywhere auth login`. The
> error message will prompt you.

### 4. Use data hooks in your pages

The generated hooks work like `useSWR` — they fetch on mount and return `{ data, error }`:

```tsx
import { useWorkEvents } from '../everywhere/data/WorkEvent.js';

export default function EventListPage() {
  const { data: events, error } = useWorkEvents();

  if (error) return <Text color="cinnamon500">{error.message}</Text>;

  return (
    <>{Array.isArray(events) && events.map((event) => <div key={event.id}>{event.name}</div>)}</>
  );
}
```

`data` is `null` while loading and an array once resolved. Check `Array.isArray(data)` before
rendering to distinguish loading from empty.

> **React hooks rule:** Call all hooks (including `useMemo`) before any early `return`. Returning
> early before a hook call causes a "Rendered fewer hooks than expected" crash.

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

## API Boundaries

- Use `@workday/everywhere` (and `@workday/everywhere/data` or `@workday/everywhere/hooks`) for
  plugin runtime code.
- Treat CLI modules under `cli/src/**` as internal implementation details.
- `@workday/everywhere/build` is a deprecated compatibility surface; prefer CLI commands such as
  `everywhere build`.

See [`docs/cli-sdk-boundary.md`](docs/cli-sdk-boundary.md) for the boundary policy and deprecation
direction.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.
