# Plugin Route System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mixed pages/hooks navigation with a unified, type-safe route system where
routes are typed objects used as both definitions and navigation targets.

**Architecture:** A `route()` factory creates `RouteDefinition` objects carrying phantom type
params. `plugin()` accepts a flat `routes` array and a `defaultRoute`. `useNavigate()` and
`useParams()` become type-safe by accepting route objects instead of strings. Internal components
(`PluginRenderer`, `TeamsShell`) update to consume the new types. The `pages` concept and its
related public exports are removed.

**Tech Stack:** TypeScript, React, Vitest

**Spec:** `docs/superpowers/specs/2026-04-27-plugin-route-system-design.md`

---

## File Map

### New Files

| File                  | Responsibility                               |
| --------------------- | -------------------------------------------- |
| `src/route.ts`        | `route()` factory and `RouteDefinition` type |
| `tests/route.test.ts` | Tests for `route()` factory                  |

### Modified Files

| File                                        | Change                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| `src/types.ts`                              | Replace `PageConfig` with `RouteConfig`; update `PluginConfig/Definition` |
| `src/plugin.ts`                             | Accept `routes` + `defaultRoute` instead of `pages`                       |
| `src/hooks/NavigationContext.tsx`           | Store active `RouteDefinition` instead of view string                     |
| `src/hooks/useNavigate.ts`                  | Accept `RouteDefinition<P>` + typed params                                |
| `src/hooks/useParams.ts`                    | Accept `RouteDefinition<P>`, return `P`                                   |
| `src/hooks/index.ts`                        | Update exports (remove `NavigationState`, `NavigationProviderProps`)      |
| `src/components/PluginRenderer.tsx`         | Match by route id from `routes` array                                     |
| `src/components/index.ts`                   | Remove `PluginRenderer`/`PluginRendererProps` from public exports         |
| `src/viewer/TeamsShell.tsx`                 | Use `defaultRoute`, navigate by route id                                  |
| `src/viewer/main.tsx`                       | No API change (consumes `PluginDefinition` internally)                    |
| `src/index.ts`                              | Add `route`/`RouteDefinition`/`RouteConfig`; remove old exports           |
| `tests/plugin.test.ts`                      | Rewrite for new `routes`/`defaultRoute` config                            |
| `tests/hooks/navigation.test.tsx`           | Rewrite for route-object-based hooks                                      |
| `tests/components/PluginRenderer.test.tsx`  | Rewrite for route-based rendering                                         |
| `examples/hello/plugin.tsx`                 | Migrate to route API                                                      |
| `examples/directory/plugin.tsx`             | Migrate to route API; extract routes file                                 |
| `examples/directory/pages/Home.tsx`         | Use route-object navigate                                                 |
| `examples/directory/pages/EmployeeList.tsx` | Remove inline detail routing; use route-object navigate                   |
| `examples/directory/pages/Spotlight.tsx`    | No navigation changes needed (no navigate calls)                          |

---

## Task 1: Create `route()` Factory and `RouteDefinition` Type

**Files:**

- Create: `src/route.ts`
- Create: `tests/route.test.ts`

- [ ] **Step 1: Write failing test — route returns object with id and component**

```typescript
// tests/route.test.ts
import { describe, it, expect } from 'vitest';
import type { ComponentType } from 'react';
import { route } from '../src/route.js';

const TestComponent: ComponentType = () => null;

describe('route()', () => {
  describe('when called with an id and config', () => {
    it('returns an object with the id', () => {
      const result = route('home', { component: TestComponent });

      expect(result.id).toBe('home');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/route.test.ts` Expected: FAIL — `route` is not exported

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/route.ts
import type { ComponentType } from 'react';

export interface RouteConfig {
  component: ComponentType;
}

export interface RouteDefinition<P extends Record<string, string> = Record<string, never>> {
  id: string;
  component: ComponentType;
  /** Phantom field — carries type info only, never set at runtime. */
  readonly _params?: P;
}

export function route<P extends Record<string, string> = Record<string, never>>(
  id: string,
  config: RouteConfig
): RouteDefinition<P> {
  return {
    id,
    component: config.component,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/route.test.ts` Expected: PASS

- [ ] **Step 5: Write failing test — route returns object with component**

```typescript
// Add to tests/route.test.ts, inside describe('route()')
it('returns an object with the component', () => {
  const result = route('home', { component: TestComponent });

  expect(result.component).toBe(TestComponent);
});
```

- [ ] **Step 6: Run test to verify it passes** (implementation already covers this)

Run: `npx vitest run tests/route.test.ts` Expected: PASS

- [ ] **Step 7: Write failing test — route object shape contains only declared properties**

```typescript
// Add to tests/route.test.ts, inside describe('route()')
it('contains only id and component properties', () => {
  const result = route('home', { component: TestComponent });

  expect(Object.keys(result)).toEqual(['id', 'component']);
});
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run tests/route.test.ts` Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/route.ts tests/route.test.ts
git commit -m "feat(routes): add route() factory and RouteDefinition type"
```

---

## Task 2: Update Types — Replace `PageConfig` with Route-Based Config

**Files:**

- Modify: `src/types.ts`

- [ ] **Step 1: Replace types file contents**

Replace the entire contents of `src/types.ts` with:

```typescript
import type { ComponentType, ReactNode } from 'react';
import type { RouteDefinition } from './route.js';

export type { RouteConfig, RouteDefinition } from './route.js';

export interface PluginConfig {
  routes?: RouteDefinition<any>[];
  defaultRoute?: RouteDefinition<Record<string, never>>;
  provider?: ComponentType<{ children: ReactNode }>;
}

export interface PluginDefinition {
  routes: RouteDefinition<any>[];
  defaultRoute: RouteDefinition<Record<string, never>> | undefined;
  provider?: ComponentType<{ children: ReactNode }>;
}
```

- [ ] **Step 2: Run typecheck to verify changes compile**

Run: `npx tsc --noEmit` Expected: Errors in files that still reference `PageConfig` and `pages` —
this is expected and will be fixed in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "refactor(types): replace PageConfig/pages with route-based types"
```

---

## Task 3: Update `plugin()` Factory

**Files:**

- Modify: `src/plugin.ts`
- Modify: `tests/plugin.test.ts`

- [ ] **Step 1: Rewrite plugin test file**

Replace the entire contents of `tests/plugin.test.ts` with:

```typescript
import { describe, it, expect } from 'vitest';
import type { ComponentType } from 'react';
import { plugin } from '../src/plugin.js';
import { route } from '../src/route.js';

const TestComponent: ComponentType = () => null;
const home = route('home', { component: TestComponent });

describe('plugin()', () => {
  describe('routes', () => {
    it('returns the provided routes', () => {
      const result = plugin({ routes: [home], defaultRoute: home });

      expect(result.routes).toEqual([home]);
    });

    describe('when omitted', () => {
      it('defaults to an empty array', () => {
        const result = plugin();

        expect(result.routes).toEqual([]);
      });
    });
  });

  describe('defaultRoute', () => {
    it('returns the provided defaultRoute', () => {
      const result = plugin({ routes: [home], defaultRoute: home });

      expect(result.defaultRoute).toBe(home);
    });

    describe('when omitted', () => {
      it('returns undefined', () => {
        const result = plugin();

        expect(result.defaultRoute).toBeUndefined();
      });
    });
  });

  describe('provider', () => {
    it('returns the provided provider', () => {
      const TestProvider: ComponentType<{ children: React.ReactNode }> = ({ children }) =>
        children as React.ReactElement;
      const result = plugin({ provider: TestProvider, routes: [home], defaultRoute: home });

      expect(result.provider).toBe(TestProvider);
    });

    describe('when omitted', () => {
      it('returns undefined', () => {
        const result = plugin();

        expect(result.provider).toBeUndefined();
      });
    });
  });

  describe('returned object shape', () => {
    it('contains only declared properties', () => {
      const result = plugin();

      expect(Object.keys(result)).toEqual(['routes', 'defaultRoute', 'provider']);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/plugin.test.ts` Expected: FAIL — `plugin()` still returns
`{ pages, provider }`

- [ ] **Step 3: Update plugin implementation**

Replace the entire contents of `src/plugin.ts` with:

```typescript
import type { PluginConfig, PluginDefinition } from './types.js';

export function plugin(config?: PluginConfig): PluginDefinition {
  return {
    routes: config?.routes ?? [],
    defaultRoute: config?.defaultRoute,
    provider: config?.provider,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/plugin.test.ts` Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/plugin.ts tests/plugin.test.ts
git commit -m "feat(plugin): accept routes and defaultRoute instead of pages"
```

---

## Task 4: Update `NavigationContext` to Use Route IDs

**Files:**

- Modify: `src/hooks/NavigationContext.tsx`

- [ ] **Step 1: Update NavigationContext to use route objects**

Replace the entire contents of `src/hooks/NavigationContext.tsx` with:

```typescript
import { createContext, type ReactNode, useContext, useState } from 'react';
import type { RouteDefinition } from '../route.js';

export interface NavigationState {
  routeId: string;
  params: Record<string, string>;
}

interface NavigationContextValue {
  state: NavigationState;
  navigate: (route: RouteDefinition<any>, params?: Record<string, string>) => void;
}

const NavigationContext = createContext<NavigationContextValue>({
  state: { routeId: '', params: {} },
  navigate: () => {},
});

export interface NavigationProviderProps {
  initialRouteId?: string;
  onNavigate?: (routeId: string, params?: Record<string, string>) => void;
  children: ReactNode;
}

export function NavigationProvider({
  initialRouteId = '',
  onNavigate,
  children,
}: NavigationProviderProps) {
  const [state, setState] = useState<NavigationState>({
    routeId: initialRouteId,
    params: {},
  });

  const navigate = (route: RouteDefinition<any>, params?: Record<string, string>) => {
    setState({ routeId: route.id, params: params ?? {} });
    onNavigate?.(route.id, params);
  };

  return (
    <NavigationContext.Provider value={{ state, navigate }}>{children}</NavigationContext.Provider>
  );
}

export function useNavigationContext(): NavigationContextValue {
  return useContext(NavigationContext);
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit` Expected: Errors in consumers of `NavigationContext` that still use old
interface — will be fixed in next tasks.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/NavigationContext.tsx
git commit -m "refactor(navigation): update NavigationContext to use route objects"
```

---

## Task 5: Update `useNavigate` Hook

**Files:**

- Modify: `src/hooks/useNavigate.ts`
- Modify: `tests/hooks/navigation.test.tsx`

- [ ] **Step 1: Rewrite navigation test file**

Replace the entire contents of `tests/hooks/navigation.test.tsx` with:

```typescript
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { FC } from 'react';
import { route } from '../../src/route.js';
import { NavigationProvider } from '../../src/hooks/NavigationContext.js';
import { useNavigate } from '../../src/hooks/useNavigate.js';
import { useParams } from '../../src/hooks/useParams.js';

const TestComponent: FC = () => null;
const home = route('home', { component: TestComponent });
const employee = route<{ id: string }>('employee', { component: TestComponent });

describe('useNavigate', () => {
  describe('when called', () => {
    it('returns a function', () => {
      let navigateFn: unknown = null;
      const Test: FC = () => {
        navigateFn = useNavigate();
        return null;
      };
      renderToStaticMarkup(
        <NavigationProvider>
          <Test />
        </NavigationProvider>,
      );

      expect(typeof navigateFn).toBe('function');
    });
  });
});

describe('useParams', () => {
  describe('when no params are set', () => {
    it('returns an empty object', () => {
      let captured: Record<string, string> = { unexpected: 'value' };
      const Test: FC = () => {
        captured = useParams(home);
        return null;
      };
      renderToStaticMarkup(
        <NavigationProvider>
          <Test />
        </NavigationProvider>,
      );

      expect(captured).toEqual({});
    });
  });
});
```

- [ ] **Step 2: Update useNavigate implementation**

Replace the entire contents of `src/hooks/useNavigate.ts` with:

```typescript
import type { RouteDefinition } from '../route.js';
import { useNavigationContext } from './NavigationContext.js';

type NavigateFn = <P extends Record<string, string>>(
  route: RouteDefinition<P>,
  ...args: keyof P extends never ? [] : [params: P]
) => void;

export function useNavigate(): NavigateFn {
  const { navigate } = useNavigationContext();
  return navigate as NavigateFn;
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx vitest run tests/hooks/navigation.test.tsx` Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useNavigate.ts tests/hooks/navigation.test.tsx
git commit -m "feat(hooks): make useNavigate accept route objects with typed params"
```

---

## Task 6: Update `useParams` Hook

**Files:**

- Modify: `src/hooks/useParams.ts`
- Modify: `tests/hooks/navigation.test.tsx`

- [ ] **Step 1: Update useParams implementation**

Replace the entire contents of `src/hooks/useParams.ts` with:

```typescript
import type { RouteDefinition } from '../route.js';
import { useNavigationContext } from './NavigationContext.js';

export function useParams<P extends Record<string, string>>(_route: RouteDefinition<P>): P {
  const { state } = useNavigationContext();
  return state.params as P;
}
```

The `_route` parameter is used for type inference only at this stage. The runtime value is not
checked — the TypeScript compiler ensures callers pass the correct route.

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run tests/hooks/navigation.test.tsx` Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useParams.ts
git commit -m "feat(hooks): make useParams accept route object and return typed params"
```

---

## Task 7: Update Barrel Exports

**Files:**

- Modify: `src/hooks/index.ts`
- Modify: `src/components/index.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Update hooks barrel**

Replace the entire contents of `src/hooks/index.ts` with:

```typescript
export { NavigationProvider } from './NavigationContext.js';
export type { NavigationProviderProps } from './NavigationContext.js';
export { useNavigate } from './useNavigate.js';
export { useParams } from './useParams.js';
```

This removes the `NavigationState` export — it is now an internal detail.

- [ ] **Step 2: Update components barrel**

Replace the entire contents of `src/components/index.ts` with:

```typescript
export { StyleBoundary } from './StyleBoundary.js';
export type { StyleBoundaryProps } from './StyleBoundary.js';
```

This removes the `PluginRenderer` and `PluginRendererProps` exports — they are internal to the
viewer.

- [ ] **Step 3: Update SDK entry point**

Replace the entire contents of `src/index.ts` with:

```typescript
export type { RouteConfig, RouteDefinition, PluginConfig, PluginDefinition } from './types.js';
export { route } from './route.js';
export { plugin } from './plugin.js';

export { StyleBoundary } from './components/index.js';
export type { StyleBoundaryProps } from './components/index.js';

export { NavigationProvider } from './hooks/index.js';
export type { NavigationProviderProps } from './hooks/index.js';
export { useNavigate } from './hooks/index.js';
export { useParams } from './hooks/index.js';

export type { FieldType, FieldSchema, ModelSchema, CurrencyValue } from './data/index.js';
export type { DataResolver } from './data/index.js';
export { HttpResolver } from './data/index.js';
export { DataProvider } from './data/index.js';
export type { DataProviderProps } from './data/index.js';
export { useQuery } from './data/index.js';
export type { QueryOptions, QueryResult } from './data/index.js';
export { useMutation } from './data/index.js';
export type { MutationResult } from './data/index.js';
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit` Expected: Errors only in `PluginRenderer.tsx`, `TeamsShell.tsx`, and example
files — all addressed in subsequent tasks.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/index.ts src/components/index.ts src/index.ts
git commit -m "refactor(exports): update barrels for route-based API"
```

---

## Task 8: Update `PluginRenderer`

**Files:**

- Modify: `src/components/PluginRenderer.tsx`
- Modify: `tests/components/PluginRenderer.test.tsx`

- [ ] **Step 1: Rewrite PluginRenderer test file**

Replace the entire contents of `tests/components/PluginRenderer.test.tsx` with:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { FC } from 'react';
import { PluginRenderer } from '../../src/components/PluginRenderer.js';
import { route } from '../../src/route.js';
import type { PluginDefinition } from '../../src/types.js';

const HomePage: FC = () => <div>Home Page</div>;
const SettingsPage: FC = () => <div>Settings Page</div>;

const home = route('home', { component: HomePage });
const settings = route('settings', { component: SettingsPage });

function makePlugin(overrides?: Partial<PluginDefinition>): PluginDefinition {
  return {
    routes: [home, settings],
    defaultRoute: home,
    ...overrides,
  };
}

describe('PluginRenderer', () => {
  describe('when the active route exists', () => {
    it('renders the active route component', () => {
      const p = makePlugin();
      const html = renderToStaticMarkup(<PluginRenderer plugin={p} activeRouteId="home" />);

      expect(html).toContain('Home Page');
    });
  });

  describe('when a different route is active', () => {
    it('renders that route instead', () => {
      const p = makePlugin();
      const html = renderToStaticMarkup(<PluginRenderer plugin={p} activeRouteId="settings" />);

      expect(html).toContain('Settings Page');
    });
  });

  describe('when the active route does not exist', () => {
    it('renders a fallback message', () => {
      const p = makePlugin();
      const html = renderToStaticMarkup(
        <PluginRenderer plugin={p} activeRouteId="nonexistent" />,
      );

      expect(html).toContain('No route found');
    });
  });

  describe('when plugin has a provider', () => {
    it('wraps content in the provider', () => {
      const TestProvider: FC<{ children: React.ReactNode }> = ({ children }) => (
        <div data-testid="provider">{children}</div>
      );
      const p = makePlugin({ provider: TestProvider });
      const html = renderToStaticMarkup(<PluginRenderer plugin={p} activeRouteId="home" />);

      expect(html).toContain('data-testid="provider"');
    });
  });

  describe('when onNavigate is provided', () => {
    it('does not throw during render', () => {
      const p = makePlugin();
      const onNavigate = vi.fn();

      expect(() =>
        renderToStaticMarkup(
          <PluginRenderer plugin={p} activeRouteId="home" onNavigate={onNavigate} />,
        ),
      ).not.toThrow();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/components/PluginRenderer.test.tsx` Expected: FAIL — `PluginRenderer`
still uses `activePageId`

- [ ] **Step 3: Update PluginRenderer implementation**

Replace the entire contents of `src/components/PluginRenderer.tsx` with:

```typescript
import { NavigationProvider } from '../hooks/index.js';
import { StyleBoundary } from './StyleBoundary.js';
import type { PluginDefinition } from '../types.js';

export interface PluginRendererProps {
  plugin: PluginDefinition;
  activeRouteId: string;
  onNavigate?: (routeId: string) => void;
}

export function PluginRenderer({ plugin, activeRouteId, onNavigate }: PluginRendererProps) {
  const activeRoute = plugin.routes.find((r) => r.id === activeRouteId);

  if (!activeRoute) {
    return <div style={{ padding: 16, color: '#888' }}>No route found</div>;
  }

  const ActiveComponent = activeRoute.component;

  return (
    <StyleBoundary provider={plugin.provider}>
      <NavigationProvider
        initialRouteId={activeRouteId}
        onNavigate={(routeId) => {
          if (plugin.routes.some((r) => r.id === routeId)) {
            onNavigate?.(routeId);
          }
        }}
      >
        <ActiveComponent />
      </NavigationProvider>
    </StyleBoundary>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/components/PluginRenderer.test.tsx` Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/PluginRenderer.tsx tests/components/PluginRenderer.test.tsx
git commit -m "refactor(PluginRenderer): use routes instead of pages"
```

---

## Task 9: Update `TeamsShell`

**Files:**

- Modify: `src/viewer/TeamsShell.tsx`

- [ ] **Step 1: Update TeamsShell to use routes and defaultRoute**

Replace the entire contents of `src/viewer/TeamsShell.tsx` with:

```typescript
import { useState } from 'react';
import { PluginRenderer } from '../components/PluginRenderer.js';
import type { PluginDefinition } from '../types.js';

interface TeamsShellProps {
  plugin: PluginDefinition;
  name: string;
  version: string;
}

export function TeamsShell({ plugin, name, version }: TeamsShellProps) {
  const [activeRouteId, setActiveRouteId] = useState(
    plugin.defaultRoute?.id ?? plugin.routes[0]?.id ?? '',
  );

  if (plugin.routes.length === 0) {
    return (
      <div className="viewer-shell">
        <header className="viewer-header">
          <span className="viewer-header-name">{name}</span>
          <span className="viewer-header-version">v{version}</span>
        </header>
        <div className="viewer-empty">No routes defined in this plugin.</div>
      </div>
    );
  }

  return (
    <div className="viewer-shell">
      <header className="viewer-header">
        <span className="viewer-header-name">{name}</span>
        <span className="viewer-header-version">v{version}</span>
        <nav className="viewer-tabs">
          {plugin.routes.map((r) => (
            <button
              key={r.id}
              className="viewer-tab"
              data-active={activeRouteId === r.id}
              onClick={() => setActiveRouteId(r.id)}
            >
              {r.id}
            </button>
          ))}
        </nav>
      </header>
      <main className="viewer-content">
        <PluginRenderer
          plugin={plugin}
          activeRouteId={activeRouteId}
          onNavigate={setActiveRouteId}
        />
      </main>
    </div>
  );
}
```

Note: The viewer shell still renders tabs for all routes using `r.id` as the label. This is the dev
viewer only — the production Teams host renders a single tab for the plugin. The dev viewer shows
all routes for debugging convenience.

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit` Expected: Errors only in example files — addressed in the next task.

- [ ] **Step 3: Commit**

```bash
git add src/viewer/TeamsShell.tsx
git commit -m "refactor(TeamsShell): use routes and defaultRoute"
```

---

## Task 10: Migrate Examples

**Files:**

- Create: `examples/directory/routes.ts`
- Modify: `examples/directory/plugin.tsx`
- Modify: `examples/directory/pages/Home.tsx`
- Modify: `examples/directory/pages/EmployeeList.tsx`
- Modify: `examples/hello/plugin.tsx`

- [ ] **Step 1: Create directory example routes file**

```typescript
// examples/directory/routes.ts
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

Note: `EmployeeDetail` does not exist yet as a separate file — it is currently inline in
`EmployeeList.tsx`. It will be extracted in step 3.

- [ ] **Step 2: Update directory plugin.tsx**

Replace the entire contents of `examples/directory/plugin.tsx` with:

```typescript
import { type ReactNode } from 'react';
import { plugin, DataProvider, HttpResolver } from '@workday/everywhere';
import { CanvasProvider } from '@workday/canvas-kit-react';
import '@workday/canvas-tokens-web/css/base/_variables.css';
import '@workday/canvas-tokens-web/css/system/_variables.css';
import './styles.css';
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

- [ ] **Step 3: Extract EmployeeDetail into its own file**

Create `examples/directory/pages/EmployeeDetail.tsx`:

```typescript
import { useNavigate, useParams } from '@workday/everywhere';
import { Card, Flex, SecondaryButton, Text } from '@workday/canvas-kit-react';
import { employee, employees } from '../routes.js';
import { useEmployee } from '../everywhere/data/Employee.js';

export default function EmployeeDetail() {
  const { id } = useParams(employee);
  const navigate = useNavigate();
  const { data: emp } = useEmployee(id ?? '');

  return (
    <Flex flexDirection="column" gap="s" padding="s">
      <SecondaryButton size="small" onClick={() => navigate(employees)}>
        Back to list
      </SecondaryButton>
      <Card>
        <Card.Heading>{emp?.name ?? 'Employee Detail'}</Card.Heading>
        <Card.Body>
          {emp ? (
            <Flex gap="m">
              <img
                src={emp.photoUrl}
                alt={emp.name}
                style={{ width: 80, height: 80, borderRadius: 8 }}
              />
              <Flex flexDirection="column" gap="xxs">
                <Text typeLevel="body.large" fontWeight="bold">
                  {emp.title}
                </Text>
                <Text typeLevel="body.small" color="licorice300">
                  {emp.department}
                </Text>
                <Text typeLevel="body.small">{emp.email}</Text>
                <Text typeLevel="subtext.medium" color="licorice300">
                  Started {emp.startDate}
                </Text>
                {emp.isRemote && (
                  <Text typeLevel="subtext.medium" color="blueberry400">
                    Remote
                  </Text>
                )}
                {emp.bio && (
                  <Text typeLevel="body.small" style={{ marginTop: 8 }}>
                    {emp.bio}
                  </Text>
                )}
              </Flex>
            </Flex>
          ) : (
            <Text>Employee not found: {id}</Text>
          )}
        </Card.Body>
      </Card>
    </Flex>
  );
}
```

- [ ] **Step 4: Update EmployeeList.tsx — remove inline detail, use route-based navigate**

Replace the entire contents of `examples/directory/pages/EmployeeList.tsx` with:

```typescript
import { useNavigate } from '@workday/everywhere';
import { Card, Flex, Heading, Text } from '@workday/canvas-kit-react';
import { employee } from '../routes.js';
import { useEmployees } from '../everywhere/data/Employee.js';
import type { Employee } from '../everywhere/data/models.js';

function EmployeeRow({ emp, onClick }: { emp: Employee; onClick: () => void }) {
  return (
    <Flex
      alignItems="center"
      gap="s"
      padding="xs"
      style={{ cursor: 'pointer', borderRadius: 8 }}
      onClick={onClick}
    >
      <img
        src={emp.photoUrl}
        alt={emp.name}
        style={{ width: 40, height: 40, borderRadius: '50%' }}
      />
      <Flex flexDirection="column" flex={1}>
        <Text typeLevel="body.small" fontWeight="bold">
          {emp.name}
        </Text>
        <Text typeLevel="subtext.medium" color="licorice300">
          {emp.title}
        </Text>
      </Flex>
      <Text typeLevel="subtext.medium" color="licorice300">
        {emp.department}
      </Text>
    </Flex>
  );
}

export default function EmployeeListPage() {
  const navigate = useNavigate();
  const { data: employees } = useEmployees();

  return (
    <Flex flexDirection="column" gap="m" padding="s">
      <Heading size="large">Employees</Heading>
      <Text typeLevel="body.large" color="licorice300">
        {Array.isArray(employees) ? `${employees.length} employees` : 'Loading...'}
      </Text>
      <Card>
        <Card.Body>
          <Flex flexDirection="column" gap="xxs">
            {Array.isArray(employees) &&
              employees.map((emp) => (
                <EmployeeRow
                  key={emp.id}
                  emp={emp}
                  onClick={() => navigate(employee, { id: emp.id })}
                />
              ))}
          </Flex>
        </Card.Body>
      </Card>
    </Flex>
  );
}
```

- [ ] **Step 5: Update Home.tsx — use route-based navigate**

Replace the `navigate('employees')` call in `examples/directory/pages/Home.tsx` (line 82):

Change:

```typescript
import { useNavigate } from '@workday/everywhere';
```

to:

```typescript
import { useNavigate } from '@workday/everywhere';
import { employees } from '../routes.js';
```

Change:

```typescript
<SecondaryButton onClick={() => navigate('employees')}>
```

to:

```typescript
<SecondaryButton onClick={() => navigate(employees)}>
```

- [ ] **Step 6: Update hello example**

Replace the entire contents of `examples/hello/plugin.tsx` with:

```typescript
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
```

- [ ] **Step 7: Run typecheck**

Run: `npx tsc --noEmit` Expected: PASS — no errors

- [ ] **Step 8: Run all tests**

Run: `npx vitest run` Expected: PASS — all tests green

- [ ] **Step 9: Run formatter**

Run: `just tidy` Expected: All files formatted

- [ ] **Step 10: Commit**

```bash
git add examples/ src/
git commit -m "feat: migrate examples to route-based navigation"
```

---

## Task 11: Final Verification

- [ ] **Step 1: Run full check suite**

Run: `just check` Expected: PASS — typecheck + lint clean

- [ ] **Step 2: Run full test suite**

Run: `just test` Expected: PASS — all tests green

- [ ] **Step 3: Verify no old API references remain in src/**

Run: `grep -rn 'PageConfig\|\.pages\b' src/` Expected: No matches

- [ ] **Step 4: Commit any remaining fixes**

If steps 1-3 revealed issues, fix and commit them. Otherwise, no commit needed.
