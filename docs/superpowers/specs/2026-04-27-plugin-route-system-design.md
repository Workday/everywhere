# Plugin Route System Design

## Problem

The current navigation system uses a mixed pages/hooks approach that creates several issues:

- **Ghost routes:** Components navigate to views (`'employees/detail'`) that don't exist in the
  pages array. The shell silently ignores them while `NavigationProvider` updates internal state.
- **In-page routing:** Pages implement their own sub-navigation via conditional rendering
  (`if (id) return <Detail />`), duplicating framework responsibilities.
- **No route contracts:** `useParams()` returns `Record<string, string>` with no type safety or
  declaration of what params a route expects.
- **Split state:** `TeamsShell` owns `activePageId` and `NavigationProvider` owns `{ view, params }`
  — two sources of truth that sync via callbacks and can drift.

## Design

Replace the `pages` concept with a unified route system where routes are typed objects that serve as
both definitions and navigation targets.

### Route Primitives

The `route()` factory creates a `RouteDefinition` — a plain value containing an id, a component, and
phantom type information for params:

```typescript
interface RouteConfig {
  component: ComponentType;
}

interface RouteDefinition<P extends Record<string, string> = Record<string, never>> {
  id: string;
  component: ComponentType;
  // P is phantom — used for type inference only, not stored at runtime
}

function route<P extends Record<string, string> = Record<string, never>>(
  id: string,
  config: RouteConfig
): RouteDefinition<P>;
```

Usage:

```typescript
const home = route('home', { component: HomePage });
const employee = route<{ id: string }>('employee', { component: EmployeeDetail });
```

Routes have no `title` — the framework does not derive tab labels or headers from route metadata.
Plugin authors handle their own headings inside components.

`Record<string, never>` as the default type parameter means routes with no explicit type param
accept zero params at navigate-time.

### Navigation Hooks

**`useNavigate()`** returns a type-safe navigation function that accepts a route object and its
params:

```typescript
type NavigateFn = <P extends Record<string, string>>(
  route: RouteDefinition<P>,
  ...args: keyof P extends never ? [] : [params: P]
) => void;
```

The conditional spread makes params optional when the route has none and required when it does:

```typescript
const navigate = useNavigate();

navigate(home); // no params required
navigate(employee, { id: '42' }); // params match route type
navigate(employee); // TypeScript error: missing { id: string }
navigate(home, { id: '42' }); // TypeScript error: no params expected
```

**`useParams(route)`** takes a route object and returns its typed params:

```typescript
const { id } = useParams(employee); // id is string, fully typed
```

The route argument drives the return type and acts as a dev-mode assertion — if the active route
doesn't match the passed route, a console warning is emitted (not a thrown error, to avoid crashing
the plugin).

### Plugin Configuration

```typescript
interface PluginConfig {
  routes: RouteDefinition<any>[];
  defaultRoute: RouteDefinition<Record<string, never>>;
  provider?: ComponentType<{ children: ReactNode }>;
}
```

- **`defaultRoute`** is the route rendered when the plugin first loads. It must have no params
  (enforced by its type) since there is no context to supply params at startup.
- **`routes`** contains all navigable routes, including the default. The framework validates at dev
  time that `defaultRoute` appears in the `routes` array.
- **`provider`** wraps all route components, same as today.

The plugin gets exactly one tab in the Teams shell. The tab label comes from the plugin's package
manifest (name/title), not from route metadata. The framework controls the shell chrome.

### Param Validation Strategy

Type-level only. Route params are validated by TypeScript at compile time — no runtime schema. This
provides the best DX (editor errors at authoring time) with zero runtime cost. Runtime validation
can be layered on later if needed (e.g., for host-initiated navigations) without changing the plugin
author's API.

### What This Design Does Not Include

- **Deep linking from the host.** Route definitions are static data and can be extracted into a
  build-time manifest later. Deferring this is not a one-way door.
- **URL or browser history integration.** The plugin runs inside a Teams container with no visible
  address bar. Navigation is pure application state.
- **Nested route layouts.** Nesting is not visible to the user in the Teams container. Routes are a
  flat list.
- **Runtime param schemas.** Type-level validation only for now.

## Example

Full directory plugin under the new API:

```typescript
// routes.ts
import { route } from '@workday/everywhere';
import HomePage from './pages/Home.js';
import EmployeeListPage from './pages/EmployeeList.js';
import EmployeeDetail from './pages/EmployeeDetail.js';
import SpotlightPage from './pages/Spotlight.js';

export const home = route('home', { component: HomePage });
export const employees = route('employees', { component: EmployeeListPage });
export const employee = route<{ id: string }>('employee', { component: EmployeeDetail });
export const spotlight = route('spotlight', { component: SpotlightPage });
```

```typescript
// plugin.tsx
import { type ReactNode } from 'react';
import { plugin, DataProvider, HttpResolver } from '@workday/everywhere';
import { CanvasProvider } from '@workday/canvas-kit-react';
import { home, employees, employee, spotlight } from './routes.js';

const resolver = new HttpResolver('/api/data');

function DirectoryProvider({ children }: { children: ReactNode }) {
  return (
    <CanvasProvider>
      <DataProvider resolver={resolver}>{children}</DataProvider>
    </CanvasProvider>
  );
}

export default plugin({
  provider: DirectoryProvider,
  defaultRoute: home,
  routes: [home, employees, employee, spotlight],
});
```

```typescript
// pages/EmployeeList.tsx
import { useNavigate } from '@workday/everywhere';
import { employee } from '../routes.js';

export default function EmployeeListPage() {
  const navigate = useNavigate();

  return (
    <EmployeeRow onClick={() => navigate(employee, { id: emp.id })} />
  );
}
```

```typescript
// pages/EmployeeDetail.tsx
import { useNavigate, useParams } from '@workday/everywhere';
import { employee, employees } from '../routes.js';

export default function EmployeeDetail() {
  const { id } = useParams(employee);
  const navigate = useNavigate();

  return (
    <SecondaryButton onClick={() => navigate(employees)}>
      Back to list
    </SecondaryButton>
  );
}
```

## Public API Changes

### Added

- `route()` factory function
- `RouteDefinition` type
- `RouteConfig` type

### Changed

- `PluginConfig` — `pages` replaced by `routes` + `defaultRoute`
- `PluginDefinition` — same change as `PluginConfig`
- `useNavigate()` — accepts route objects instead of strings
- `useParams(route)` — requires a route argument, returns typed params

### Removed

- `PageConfig` type
- `NavigationState` type (becomes internal)
- `NavigationProvider` export (becomes internal)
- `NavigationProviderProps` type
- `PluginRenderer` export (becomes internal)
- `PluginRendererProps` type

## Migration

This is a clean break — no deprecation shim for the old `pages` API. The SDK is early enough that a
compatibility layer adds complexity for minimal benefit.

Migration steps for existing plugins:

1. Create a `routes.ts` file with `route()` definitions for each former page
2. Replace `plugin({ pages: [...] })` with `plugin({ routes: [...], defaultRoute: ... })`
3. Update `navigate('someId', params)` calls to `navigate(someRoute, params)`
4. Update `useParams()` calls to `useParams(someRoute)`
5. Extract conditional sub-view rendering into separate route components
