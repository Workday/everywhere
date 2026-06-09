# REST Data Provider — Design

**Date:** 2026-06-09
**Branch:** `feat/rest-data-provider`
**Status:** Approved for implementation planning

## Summary

Add a REST data primitive to the SDK alongside the existing GraphQL resolver, share a single
HTTP transport layer between both protocols, and replace the dev server's local GraphQL mock
with a transparent proxy to Workday. The directory example is reworked to a single card backed
by the real `/workers/me` REST endpoint.

## Goals

- Plugin authors can call Workday REST endpoints with the same ergonomics as GraphQL.
- One shared transport layer (headers, auth-error mapping, JSON handling) underneath both REST and
  GraphQL clients — no duplicated fetch code.
- Dev server proxies real Workday traffic, removing the offline JSON-file mock that masked the
  real network shape.
- First consumer: the directory example, reduced to a single card showing data from
  `/common/v1/workers/me`.

## Non-goals

- No "bind"-style codegen or model/CRUD abstraction for REST. REST stays path-based.
- No retry, caching, or interceptor framework in the shared HTTP layer.
- No production platform proxy work — that's parallel work owned elsewhere. This change covers
  the SDK clients and the local dev-server proxy only.
- No new outbound network calls from runtime code beyond the request the plugin author makes.

## Architecture

Three layers in `src/data/`:

```
HttpClient             ← transport: fetch wrapper, headers, JSON, auth-error mapping
  ├── RestClient       ← REST primitive: get/post/put/patch/delete
  └── GraphQLClient    ← GraphQL primitive: execute(query, variables)
         └── GraphQLResolver  ← existing model/CRUD DataResolver, now over GraphQLClient
```

Plugin-facing surface:

- `RestClient` + `useRequest` hook — for REST.
- `GraphQLClient` — for plugin authors who want to write GraphQL by hand.
- `GraphQLResolver` + `useQuery` + `useMutation` — unchanged contract for `bind`-generated typed
  hooks; internally now uses `GraphQLClient`.

## Component shapes

### `HttpClient` (`src/data/HttpClient.ts`)

```ts
export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;            // JSON-serialized if present
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export class HttpError extends Error {
  constructor(public status: number, public statusText: string, public body?: unknown);
}

export class HttpAuthError extends HttpError {}

export class HttpClient {
  constructor(baseUrl?: string);  // default: origin
  request<T>(path: string, opts?: HttpRequestOptions): Promise<T>;
}
```

Owns:

- Base URL composition (absolute or origin-relative).
- Header injection: `Content-Type`, `accept`, and the `x-app-id` global header
  (`globalThis.__WE_APP_ID__`) lifted from both existing resolvers.
- JSON parse with safe fallback when the body isn't JSON.
- Non-2xx → `HttpError`; 401/403 → `HttpAuthError` carrying the "Run `npx @workday/everywhere auth
  login`" guidance.
- Abort-signal pass-through.

Explicitly out of scope: retries, caching, interceptors, protocol knowledge.

### `RestClient` (`src/data/RestClient.ts`)

```ts
export interface RestRequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export class RestClient {
  constructor(client?: HttpClient | string);  // string = baseUrl shorthand
  get<T>(path: string, opts?: RestRequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown, opts?: RestRequestOptions): Promise<T>;
  put<T>(path: string, body?: unknown, opts?: RestRequestOptions): Promise<T>;
  patch<T>(path: string, body?: unknown, opts?: RestRequestOptions): Promise<T>;
  delete<T>(path: string, opts?: RestRequestOptions): Promise<T>;
}
```

Returns parsed JSON. No CRUD/model framing.

### `GraphQLClient` (`src/data/GraphQLClient.ts`)

```ts
export class GraphQLClient {
  // endpoint defaults to '/api/v1/proxy/graphql/v5'
  constructor(client?: HttpClient | string, endpoint?: string);
  execute<T>(query: string, variables?: Record<string, unknown>): Promise<T>;
}
```

Internally: builds the `{ query, variables }` request envelope, POSTs via `HttpClient`, parses the
`{ data, errors }` response envelope. Maps GraphQL extension codes `UNAUTHENTICATED` /
`FORBIDDEN` → `HttpAuthError`. Joins remaining `errors[]` messages with `; ` and throws a regular
`Error`.

### `useRequest` hook (`src/data/useRequest.ts`)

```ts
export interface UseRequestOptions { skip?: boolean }
export interface RequestResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
export function useRequest<T>(path: string, opts?: UseRequestOptions): RequestResult<T>;
```

GET-only. Mirrors `useQuery` shape. Pulls its `RestClient` from `DataProvider` context. For
mutations, callers use `RestClient` directly — matches how `useMutation` already works for
GraphQL.

### `GraphQLResolver` refactor

- External constructor signature unchanged.
- Internal `execute()` deleted; resolver delegates to `GraphQLClient.execute`.
- Default endpoint moves from `${origin}/api/v1/data/graphql` to
  `${origin}/api/v1/proxy/graphql/v5` (matches platform proxy migration).
- Header/auth logic deleted from the resolver — lives in `HttpClient` and `GraphQLClient` now.
- Workday-specific logic stays: `workdayID` mapping, mutation input shaping, operation naming,
  schema-driven selection sets, dynamic CurrencyValue introspection.

### `DataProvider` (`src/data/DataContext.tsx`)

Extended to accept a REST client alongside the existing resolver:

```ts
interface DataProviderProps {
  resolver?: DataResolver;     // for useQuery / useMutation
  client?: RestClient;         // for useRequest
  children: ReactNode;
}
```

Both optional. Hooks throw a clear error when used without their corresponding client wired in
(`useRequest` without `client`, `useQuery` without `resolver`).

### Public exports (`src/data/index.ts`)

Added:

- `HttpClient`, `HttpError`, `HttpAuthError`
- `RestClient`
- `GraphQLClient`
- `useRequest`, `RequestResult`, `UseRequestOptions`

Removed:

- `HttpResolver` (the legacy mock client; never a useful public contract).

## Dev-server proxy

Replace the existing mock route in `cli/src/data/vite-data-plugin.ts` with a transparent forwarder.

### URL mapping

The proxy is a direct API pass-through to Workday. It strips the `/api/v1/proxy/` prefix, prepends
`/ccx/api/`, and injects the tenant path segment:

| Plugin calls                                  | Proxy forwards to                                                |
| --------------------------------------------- | ---------------------------------------------------------------- |
| `/api/v1/proxy/common/v1/workers/me`          | `https://<host>/ccx/api/common/v1/<tenant>/workers/me`           |
| `/api/v1/proxy/graphql/v5`                    | `https://<host>/ccx/api/graphql/v5/<tenant>`                     |

### Behavior

- Reads host, tenant, and bearer token from the CLI's stored auth/gateway state (already
  established by `auth login`).
- Injects `Authorization: Bearer <token>` on the upstream request. Existing `proxy-auth.ts`
  scaffolding is the starting point.
- Forwards method, body, and content-type from the incoming request unchanged.
- Returns upstream status and body verbatim (no reshaping).
- Missing/expired token (no `we_session` cookie, no stored bearer): responds `401` with a JSON body
  so `HttpAuthError` fires client-side with proper guidance.
- Upstream network failure: responds `502` with a short JSON error body.

### Removed in this change

- `cli/src/data/graphql-handler.ts`
- `cli/src/data/local-store.ts`
- The mock `/api/v1/data/graphql` route inside `vite-data-plugin.ts`
- Any associated `.data/` fixtures under example projects that no longer apply

## Examples

### `directory` — rewritten

Single page, single card backed by the real `/workers/me` endpoint.

`plugin.tsx`:

```tsx
import { plugin, DataProvider, RestClient } from '@workday/everywhere';
import { CanvasProvider } from '@workday/canvas-kit-react';
import { home } from './routes.js';

const client = new RestClient('/api/v1/proxy');

function DirectoryProvider({ children }: { children: ReactNode }) {
  return (
    <CanvasProvider>
      <DataProvider client={client}>{children}</DataProvider>
    </CanvasProvider>
  );
}

export default plugin({
  provider: DirectoryProvider,
  defaultRoute: home,
  routes: [home],
});
```

`pages/Home.tsx`:

```tsx
import { useRequest } from '@workday/everywhere';

interface Worker {
  descriptor: string;
  // additional displayed fields as the response shape is firmed up
}

export default function Home() {
  const { data, loading, error } = useRequest<Worker>('/common/v1/workers/me');
  if (loading) return <Card>Loading…</Card>;
  if (error) return <Card>Error: {error.message}</Card>;
  return <Card><h2>{data?.descriptor}</h2></Card>;
}
```

`routes.ts` shrinks to just `home`. Old pages (`EmployeeList`, `EmployeeDetail`, `Spotlight`) and
the `model/` directory are removed.

### Other examples

Audited per-example during implementation:

- `charitable-donations`, `work-events`, `create-work-event`: depend on the mock today. Convert to
  real proxy calls where a clean real-data analog exists; otherwise remove.
- `hello`: no data calls, retained as-is.

## Error handling

Hierarchy (defined in `HttpClient`):

```
Error
└── HttpError                  // any non-2xx response, plus parse failures
    └── HttpAuthError          // 401 or 403, plus GraphQL UNAUTHENTICATED / FORBIDDEN
```

Both carry `status`, `statusText`, and the parsed response body (if JSON) for caller inspection.
`HttpAuthError.message` includes "Run `npx @workday/everywhere auth login`".

Behavior:

- Network failure (`fetch` rejects): underlying `TypeError` propagates unchanged.
- Non-JSON response body: caught; reported as `HttpError` with `body: undefined`.
- GraphQL `errors[]`: messages joined with `; ` and thrown as `Error`, or `HttpAuthError` if any
  extension code is `UNAUTHENTICATED` / `FORBIDDEN`.
- Hooks (`useRequest`, `useQuery`, `useMutation`): catch and store error in result state; do not
  throw into render.

## CLI `bind`

Untouched.

- Generated hooks reference `useQuery` / `useMutation` (resolver-agnostic) — they keep working as
  long as those exports remain.
- The CLI's introspection step (`cli/src/codegen/introspect.ts`) is server-to-server with its own
  bearer token and does not go through the in-browser proxy.

## Testing

Follows project TDD rules (CLAUDE.md): failing test first, one expectation per `it`, one branch
per `describe`.

### Unit (Vitest, alongside source)

- `HttpClient`: header injection, `x-app-id`, base-URL composition, JSON parse, 2xx/4xx/5xx
  mapping, 401/403 → `HttpAuthError`, abort signal pass-through. Mock `fetch`.
- `RestClient`: each method calls `HttpClient` with the right method/body. Mock `HttpClient`.
- `GraphQLClient`: envelope shape, `errors[]` → throw, auth-extension-code mapping. Mock
  `HttpClient`.
- `GraphQLResolver`: existing tests retained, refactored to mock `GraphQLClient` instead of
  `fetch`.
- `useRequest`: loading / data / error transitions, `skip`, `refetch`. React Testing Library
  with mocked `RestClient`.

### Integration (`cli/tests/`)

- Dev-server proxy: `/api/v1/proxy/*` forwarding — tenant injection, token injection, prefix
  stripping, 401 on missing token, upstream status/body pass-through. Upstream mocked with `msw/
  node` or a small `http.createServer`.

### Manual smoke

- Run the `directory` example through the dev server with a valid `auth login` token; verify the
  `/me` card renders.

## Public-API impact

- **Added** to `@workday/everywhere`: `HttpClient`, `HttpError`, `HttpAuthError`, `RestClient`,
  `GraphQLClient`, `useRequest`, `RequestResult`, `UseRequestOptions`.
- **Removed** from `@workday/everywhere`: `HttpResolver`. Per maintainer direction, removed
  outright rather than deprecated — the mock-shaped resolver was never a useful contract.
- **Changed**: `DataProviderProps` gains an optional `client` field. Existing usage with
  `resolver` continues to work unchanged.
- **Changed**: `GraphQLResolver` default endpoint shifts from `${origin}/api/v1/data/graphql` to
  `${origin}/api/v1/proxy/graphql/v5`. Callers passing an explicit endpoint are unaffected.

## Open questions

- Final per-example disposition (`charitable-donations`, `work-events`, `create-work-event`)
  decided during implementation as each is touched.
- Exact shape of the `Worker` response body displayed in the directory card — settle once the
  proxy round-trips against a real tenant.
