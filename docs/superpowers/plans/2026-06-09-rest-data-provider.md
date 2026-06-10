# REST Data Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a REST data primitive to the SDK alongside the existing GraphQL resolver, share one
HTTP transport layer between both, and replace the dev server's local GraphQL mock with a
transparent proxy to Workday. The directory example becomes a single card driven by `/workers/me`.

**Architecture:** Three-layer client stack in `src/data/`: an `HttpClient` transport at the bottom,
with `RestClient` and `GraphQLClient` primitives above it; `GraphQLResolver` (the existing
model-CRUD layer) sits over `GraphQLClient`. A `useRequest` React hook mirrors `useQuery`'s shape.
The dev server's `vite-data-plugin` is repointed from the local JSON mock to a transparent
`/api/v1/tenant/*` → `https://<host>/ccx/api/<service>/<version>/<tenant>/...` forwarder.

**Tech Stack:** TypeScript (strict), Vitest, React 19, React Testing Library, Vite dev server
middleware, Node 22+ `fetch`.

**Spec:** `docs/superpowers/specs/2026-06-09-rest-data-provider-design.md`

---

## Conventions for every task

- All imports use `.js` extensions even from `.ts` source.
- TDD strictly: red → green → refactor. One expectation per `it`. One branch per `describe`.
- After each task: run `npx vitest run <touched-files>` and confirm green before committing.
- Commits use Conventional Commits (`feat(data): ...`, `refactor(data): ...`, etc.). Don't include
  Co-Authored-By unless the user has asked for it for that commit.
- Work happens inside the worktree at `.worktrees/directory-assistance` on branch
  `feat/rest-data-provider`. All paths below are repo-root-relative.

---

## File Structure

**New source files:**

- `src/data/HttpClient.ts` — transport layer, error classes
- `src/data/RestClient.ts` — REST primitive
- `src/data/GraphQLClient.ts` — GraphQL primitive
- `src/data/useRequest.ts` — REST React hook

**Modified source files:**

- `src/data/GraphQLResolver.ts` — refactor to use `GraphQLClient`; new default endpoint
- `src/data/DataContext.tsx` — add optional `client` prop
- `src/data/index.ts` — add new exports, remove `HttpResolver`
- `cli/src/data/vite-data-plugin.ts` — replace mock route with `/api/v1/tenant/*` forwarder

**Deleted:**

- `src/data/HttpResolver.ts`
- `cli/src/data/graphql-handler.ts`
- `cli/src/data/local-store.ts`
- `tests/data/resolver.test.ts` (tests for `HttpResolver`)
- `cli/tests/data/graphql-handler.test.ts`

**New test files:**

- `tests/data/HttpClient.test.ts`
- `tests/data/RestClient.test.ts`
- `tests/data/GraphQLClient.test.ts`
- `tests/data/useRequest.test.tsx`
- `cli/tests/data/proxy-forwarder.test.ts`

**Examples:**

- `examples/directory/` — rewritten end-to-end
- `examples/charitable-donations/`, `examples/work-events/`, `examples/create-work-event/` — audited
  and removed (mock-bound, no clean real-data analog)
- `examples/hello/` — untouched

---

### Task 1: `HttpClient` transport + error classes

**Files:**

- Create: `src/data/HttpClient.ts`
- Create: `tests/data/HttpClient.test.ts`

- [ ] **Step 1.1: Write failing tests for the error classes**

Create `tests/data/HttpClient.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient, HttpError, HttpAuthError } from '../../src/data/HttpClient.js';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  delete (globalThis as { __WE_APP_ID__?: string }).__WE_APP_ID__;
});

describe('HttpError', () => {
  it('carries status, statusText, and body', () => {
    const err = new HttpError(500, 'Server Error', { detail: 'boom' });
    expect(err.status).toBe(500);
  });
});

describe('HttpAuthError', () => {
  it('is an HttpError', () => {
    const err = new HttpAuthError(401, 'Unauthorized');
    expect(err).toBeInstanceOf(HttpError);
  });

  it('mentions running auth login in its message', () => {
    const err = new HttpAuthError(401, 'Unauthorized');
    expect(err.message).toMatch(/auth login/);
  });
});
```

- [ ] **Step 1.2: Run tests; confirm they fail because `HttpClient` does not yet exist**

```bash
npx vitest run tests/data/HttpClient.test.ts
```

Expected: failure resolving `../../src/data/HttpClient.js`.

- [ ] **Step 1.3: Create the minimal `HttpClient.ts` with just the error classes**

Create `src/data/HttpClient.ts`:

```ts
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body?: unknown
  ) {
    super(`HTTP ${status} ${statusText}`);
    this.name = 'HttpError';
  }
}

export class HttpAuthError extends HttpError {
  constructor(status: number, statusText: string, body?: unknown) {
    super(status, statusText, body);
    this.name = 'HttpAuthError';
    this.message = `${this.message} — token expired or invalid. Run: npx @workday/everywhere auth login`;
  }
}

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export class HttpClient {
  constructor(private readonly baseUrl: string = '') {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async request<T>(_path: string, _opts?: HttpRequestOptions): Promise<T> {
    throw new Error('not implemented');
  }
}
```

- [ ] **Step 1.4: Re-run tests; confirm error-class tests pass**

```bash
npx vitest run tests/data/HttpClient.test.ts
```

Expected: 3 passes.

- [ ] **Step 1.5: Add failing tests for `HttpClient.request` behavior**

Append to `tests/data/HttpClient.test.ts`:

```ts
describe('HttpClient.request', () => {
  function mockFetch(response: Partial<Response>): ReturnType<typeof vi.fn> {
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(null),
      text: () => Promise.resolve(''),
      ...response,
    });
    globalThis.fetch = mock as unknown as typeof fetch;
    return mock;
  }

  describe('URL composition', () => {
    it('uses the path verbatim when baseUrl is empty', async () => {
      const fetchMock = mockFetch({ json: () => Promise.resolve({}) });
      await new HttpClient().request('/api/v1/tenant/x');
      expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/tenant/x');
    });

    it('prepends baseUrl when set', async () => {
      const fetchMock = mockFetch({ json: () => Promise.resolve({}) });
      await new HttpClient('https://h.example').request('/x');
      expect(fetchMock.mock.calls[0]?.[0]).toBe('https://h.example/x');
    });
  });

  describe('headers', () => {
    it('sends accept and content-type for JSON', async () => {
      const fetchMock = mockFetch({ json: () => Promise.resolve({}) });
      await new HttpClient().request('/x');
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect((init.headers as Record<string, string>)['accept']).toBe('application/json');
    });

    it('injects x-app-id from globalThis.__WE_APP_ID__ when present', async () => {
      (globalThis as { __WE_APP_ID__?: string }).__WE_APP_ID__ = 'my-app';
      const fetchMock = mockFetch({ json: () => Promise.resolve({}) });
      await new HttpClient().request('/x');
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect((init.headers as Record<string, string>)['x-app-id']).toBe('my-app');
    });

    it('merges caller-provided headers', async () => {
      const fetchMock = mockFetch({ json: () => Promise.resolve({}) });
      await new HttpClient().request('/x', { headers: { 'x-custom': 'v' } });
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect((init.headers as Record<string, string>)['x-custom']).toBe('v');
    });
  });

  describe('method and body', () => {
    it('defaults to GET', async () => {
      const fetchMock = mockFetch({ json: () => Promise.resolve({}) });
      await new HttpClient().request('/x');
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(init.method).toBe('GET');
    });

    it('serializes body as JSON', async () => {
      const fetchMock = mockFetch({ json: () => Promise.resolve({}) });
      await new HttpClient().request('/x', { method: 'POST', body: { a: 1 } });
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(init.body).toBe('{"a":1}');
    });
  });

  describe('response parsing', () => {
    it('returns parsed JSON for 2xx responses', async () => {
      mockFetch({ json: () => Promise.resolve({ ok: true }) });
      const result = await new HttpClient().request<{ ok: boolean }>('/x');
      expect(result).toEqual({ ok: true });
    });

    it('returns undefined when the body is not JSON', async () => {
      mockFetch({
        json: () => Promise.reject(new Error('not json')),
        text: () => Promise.resolve(''),
      });
      const result = await new HttpClient().request('/x');
      expect(result).toBeUndefined();
    });
  });

  describe('error mapping', () => {
    it('throws HttpAuthError on 401', async () => {
      mockFetch({ ok: false, status: 401, statusText: 'Unauthorized' });
      await expect(new HttpClient().request('/x')).rejects.toBeInstanceOf(HttpAuthError);
    });

    it('throws HttpAuthError on 403', async () => {
      mockFetch({ ok: false, status: 403, statusText: 'Forbidden' });
      await expect(new HttpClient().request('/x')).rejects.toBeInstanceOf(HttpAuthError);
    });

    it('throws HttpError on non-auth 4xx', async () => {
      mockFetch({ ok: false, status: 404, statusText: 'Not Found' });
      const error = await new HttpClient().request('/x').catch((e: unknown) => e);
      expect(error).toBeInstanceOf(HttpError);
    });

    it('throws HttpError on 5xx', async () => {
      mockFetch({ ok: false, status: 500, statusText: 'Server Error' });
      await expect(new HttpClient().request('/x')).rejects.toBeInstanceOf(HttpError);
    });
  });

  describe('abort signal', () => {
    it('passes the signal through to fetch', async () => {
      const fetchMock = mockFetch({ json: () => Promise.resolve({}) });
      const controller = new AbortController();
      await new HttpClient().request('/x', { signal: controller.signal });
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(init.signal).toBe(controller.signal);
    });
  });
});
```

- [ ] **Step 1.6: Run tests; confirm new tests fail as expected**

```bash
npx vitest run tests/data/HttpClient.test.ts
```

Expected: 12 failures from `request()` throwing `not implemented`.

- [ ] **Step 1.7: Implement `HttpClient.request`**

Replace the body of `request` in `src/data/HttpClient.ts`:

```ts
async request<T>(path: string, opts: HttpRequestOptions = {}): Promise<T> {
  const url = this.baseUrl ? `${this.baseUrl}${path}` : path;

  const headers: Record<string, string> = {
    accept: 'application/json',
    'content-type': 'application/json',
    ...(opts.headers ?? {}),
  };

  const appId = (globalThis as { __WE_APP_ID__?: string }).__WE_APP_ID__;
  if (typeof appId === 'string') headers['x-app-id'] = appId;

  const response = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  if (response.ok) return body as T;

  if (response.status === 401 || response.status === 403) {
    throw new HttpAuthError(response.status, response.statusText, body);
  }
  throw new HttpError(response.status, response.statusText, body);
}
```

- [ ] **Step 1.8: Run all `HttpClient` tests; confirm green**

```bash
npx vitest run tests/data/HttpClient.test.ts
```

Expected: 15 passes.

- [ ] **Step 1.9: Commit**

```bash
git add src/data/HttpClient.ts tests/data/HttpClient.test.ts
git commit -m "feat(data): add HttpClient transport with typed error mapping"
```

---

### Task 2: `RestClient`

**Files:**

- Create: `src/data/RestClient.ts`
- Create: `tests/data/RestClient.test.ts`

- [ ] **Step 2.1: Write failing tests**

Create `tests/data/RestClient.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { RestClient } from '../../src/data/RestClient.js';
import { HttpClient } from '../../src/data/HttpClient.js';

function fakeHttpClient(): HttpClient & { request: ReturnType<typeof vi.fn> } {
  const request = vi.fn().mockResolvedValue({ ok: true });
  return { request } as unknown as HttpClient & { request: ReturnType<typeof vi.fn> };
}

describe('RestClient', () => {
  describe('constructor', () => {
    it('accepts a baseUrl string and uses it for an internal HttpClient', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({}),
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      const client = new RestClient('https://api.example');
      await client.get('/x');
      expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.example/x');
    });
  });

  describe('get', () => {
    it('issues a GET request to the path', async () => {
      const http = fakeHttpClient();
      await new RestClient(http).get('/me');
      expect(http.request).toHaveBeenCalledWith('/me', {
        method: 'GET',
        headers: undefined,
        signal: undefined,
      });
    });
  });

  describe('post', () => {
    it('issues a POST with a JSON body', async () => {
      const http = fakeHttpClient();
      await new RestClient(http).post('/x', { a: 1 });
      expect(http.request).toHaveBeenCalledWith('/x', {
        method: 'POST',
        body: { a: 1 },
        headers: undefined,
        signal: undefined,
      });
    });
  });

  describe('put', () => {
    it('issues a PUT with a JSON body', async () => {
      const http = fakeHttpClient();
      await new RestClient(http).put('/x', { a: 1 });
      expect(http.request).toHaveBeenCalledWith('/x', {
        method: 'PUT',
        body: { a: 1 },
        headers: undefined,
        signal: undefined,
      });
    });
  });

  describe('patch', () => {
    it('issues a PATCH with a JSON body', async () => {
      const http = fakeHttpClient();
      await new RestClient(http).patch('/x', { a: 1 });
      expect(http.request).toHaveBeenCalledWith('/x', {
        method: 'PATCH',
        body: { a: 1 },
        headers: undefined,
        signal: undefined,
      });
    });
  });

  describe('delete', () => {
    it('issues a DELETE request', async () => {
      const http = fakeHttpClient();
      await new RestClient(http).delete('/x/1');
      expect(http.request).toHaveBeenCalledWith('/x/1', {
        method: 'DELETE',
        headers: undefined,
        signal: undefined,
      });
    });
  });

  describe('options pass-through', () => {
    it('forwards headers to the underlying HttpClient', async () => {
      const http = fakeHttpClient();
      await new RestClient(http).get('/x', { headers: { 'x-custom': 'v' } });
      expect(http.request).toHaveBeenCalledWith(
        '/x',
        expect.objectContaining({ headers: { 'x-custom': 'v' } })
      );
    });

    it('forwards abort signal to the underlying HttpClient', async () => {
      const http = fakeHttpClient();
      const signal = new AbortController().signal;
      await new RestClient(http).get('/x', { signal });
      expect(http.request).toHaveBeenCalledWith('/x', expect.objectContaining({ signal }));
    });
  });
});
```

- [ ] **Step 2.2: Confirm tests fail**

```bash
npx vitest run tests/data/RestClient.test.ts
```

Expected: module-not-found.

- [ ] **Step 2.3: Implement `RestClient`**

Create `src/data/RestClient.ts`:

```ts
import { HttpClient } from './HttpClient.js';

export interface RestRequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export class RestClient {
  private readonly http: HttpClient;

  constructor(client: HttpClient | string = '') {
    this.http = typeof client === 'string' ? new HttpClient(client) : client;
  }

  get<T>(path: string, opts: RestRequestOptions = {}): Promise<T> {
    return this.http.request<T>(path, {
      method: 'GET',
      headers: opts.headers,
      signal: opts.signal,
    });
  }

  post<T>(path: string, body?: unknown, opts: RestRequestOptions = {}): Promise<T> {
    return this.http.request<T>(path, {
      method: 'POST',
      body,
      headers: opts.headers,
      signal: opts.signal,
    });
  }

  put<T>(path: string, body?: unknown, opts: RestRequestOptions = {}): Promise<T> {
    return this.http.request<T>(path, {
      method: 'PUT',
      body,
      headers: opts.headers,
      signal: opts.signal,
    });
  }

  patch<T>(path: string, body?: unknown, opts: RestRequestOptions = {}): Promise<T> {
    return this.http.request<T>(path, {
      method: 'PATCH',
      body,
      headers: opts.headers,
      signal: opts.signal,
    });
  }

  delete<T>(path: string, opts: RestRequestOptions = {}): Promise<T> {
    return this.http.request<T>(path, {
      method: 'DELETE',
      headers: opts.headers,
      signal: opts.signal,
    });
  }
}
```

- [ ] **Step 2.4: Run tests; confirm green**

```bash
npx vitest run tests/data/RestClient.test.ts
```

Expected: 9 passes.

- [ ] **Step 2.5: Commit**

```bash
git add src/data/RestClient.ts tests/data/RestClient.test.ts
git commit -m "feat(data): add RestClient primitive over HttpClient"
```

---

### Task 3: `GraphQLClient`

**Files:**

- Create: `src/data/GraphQLClient.ts`
- Create: `tests/data/GraphQLClient.test.ts`

- [ ] **Step 3.1: Write failing tests**

Create `tests/data/GraphQLClient.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { GraphQLClient } from '../../src/data/GraphQLClient.js';
import { HttpClient, HttpAuthError } from '../../src/data/HttpClient.js';

function fakeHttpClient(response: unknown): HttpClient & { request: ReturnType<typeof vi.fn> } {
  const request = vi.fn().mockResolvedValue(response);
  return { request } as unknown as HttpClient & { request: ReturnType<typeof vi.fn> };
}

describe('GraphQLClient', () => {
  describe('endpoint', () => {
    it('defaults to /api/v1/tenant/graphql/v5', async () => {
      const http = fakeHttpClient({ data: {} });
      await new GraphQLClient(http).execute('{ q }');
      expect(http.request).toHaveBeenCalledWith('/api/v1/tenant/graphql/v5', expect.any(Object));
    });

    it('uses a custom endpoint when provided', async () => {
      const http = fakeHttpClient({ data: {} });
      await new GraphQLClient(http, '/custom/graphql').execute('{ q }');
      expect(http.request).toHaveBeenCalledWith('/custom/graphql', expect.any(Object));
    });
  });

  describe('envelope', () => {
    it('POSTs a body of { query, variables }', async () => {
      const http = fakeHttpClient({ data: {} });
      await new GraphQLClient(http).execute('{ q }', { id: '1' });
      expect(http.request).toHaveBeenCalledWith('/api/v1/tenant/graphql/v5', {
        method: 'POST',
        body: { query: '{ q }', variables: { id: '1' } },
      });
    });

    it('omits variables when not provided', async () => {
      const http = fakeHttpClient({ data: {} });
      await new GraphQLClient(http).execute('{ q }');
      const sent = (http.request.mock.calls[0]?.[1] as { body: unknown }).body as Record<
        string,
        unknown
      >;
      expect('variables' in sent).toBe(false);
    });
  });

  describe('response handling', () => {
    it('returns the data field on success', async () => {
      const http = fakeHttpClient({ data: { x: 1 } });
      const result = await new GraphQLClient(http).execute<{ x: number }>('{ x }');
      expect(result).toEqual({ x: 1 });
    });
  });

  describe('error handling', () => {
    it('throws an error joining all error messages with semicolons', async () => {
      const http = fakeHttpClient({ errors: [{ message: 'a' }, { message: 'b' }] });
      await expect(new GraphQLClient(http).execute('{ q }')).rejects.toThrow(/a; b/);
    });

    it('throws HttpAuthError when an error has extension code UNAUTHENTICATED', async () => {
      const http = fakeHttpClient({
        errors: [{ message: 'nope', extensions: { code: 'UNAUTHENTICATED' } }],
      });
      await expect(new GraphQLClient(http).execute('{ q }')).rejects.toBeInstanceOf(HttpAuthError);
    });

    it('throws HttpAuthError when an error has extension code FORBIDDEN', async () => {
      const http = fakeHttpClient({
        errors: [{ message: 'nope', extensions: { code: 'FORBIDDEN' } }],
      });
      await expect(new GraphQLClient(http).execute('{ q }')).rejects.toBeInstanceOf(HttpAuthError);
    });
  });
});
```

- [ ] **Step 3.2: Confirm tests fail**

```bash
npx vitest run tests/data/GraphQLClient.test.ts
```

Expected: module-not-found.

- [ ] **Step 3.3: Implement `GraphQLClient`**

Create `src/data/GraphQLClient.ts`:

```ts
import { HttpClient, HttpAuthError } from './HttpClient.js';

const DEFAULT_ENDPOINT = '/api/v1/tenant/graphql/v5';
const AUTH_CODES = new Set(['UNAUTHENTICATED', 'FORBIDDEN', 'UNAUTHORIZED']);

interface GraphQLResponseShape {
  data?: unknown;
  errors?: { message: string; extensions?: { code?: string } }[];
}

export class GraphQLClient {
  private readonly http: HttpClient;
  private readonly endpoint: string;

  constructor(client: HttpClient | string = '', endpoint: string = DEFAULT_ENDPOINT) {
    this.http = typeof client === 'string' ? new HttpClient(client) : client;
    this.endpoint = endpoint;
  }

  async execute<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const body: Record<string, unknown> = { query };
    if (variables !== undefined) body.variables = variables;

    const response = await this.http.request<GraphQLResponseShape>(this.endpoint, {
      method: 'POST',
      body,
    });

    if (response.errors?.length) {
      const isAuth = response.errors.some((e) => AUTH_CODES.has(e.extensions?.code ?? ''));
      const joined = response.errors.map((e) => e.message).join('; ');
      if (isAuth) throw new HttpAuthError(401, 'Unauthorized', { errors: response.errors });
      throw new Error(joined);
    }

    return response.data as T;
  }
}
```

- [ ] **Step 3.4: Run tests; confirm green**

```bash
npx vitest run tests/data/GraphQLClient.test.ts
```

Expected: 8 passes.

- [ ] **Step 3.5: Commit**

```bash
git add src/data/GraphQLClient.ts tests/data/GraphQLClient.test.ts
git commit -m "feat(data): add GraphQLClient primitive over HttpClient"
```

---

### Task 4: Refactor `GraphQLResolver` to use `GraphQLClient`

**Files:**

- Modify: `src/data/GraphQLResolver.ts`
- Modify: `tests/data/GraphQLResolver.test.ts`

- [ ] **Step 4.1: Inspect the existing test file**

Run `npx vitest run tests/data/GraphQLResolver.test.ts` and read the file with `Read`. Note that
existing tests mock `globalThis.fetch` and assert against a graph endpoint URL plus envelope shape.
The behavior we must preserve:

- Model/CRUD methods still work end-to-end.
- Default endpoint moves to `/api/v1/tenant/graphql/v5`.
- 401/403 still produce an auth-flavored error.

- [ ] **Step 4.2: Update `GraphQLResolver` constructor and `execute()` to delegate to
      `GraphQLClient`**

Edit `src/data/GraphQLResolver.ts`. Replace the existing constructor and `execute` method with:

```ts
import { GraphQLClient } from './GraphQLClient.js';
// ...existing imports (DataResolver, ModelSchema, etc.)

// inside the class, replace fields:
  private readonly graphql: GraphQLClient;
  // (drop: endpoint field)

// replace constructor:
  constructor(referenceId: string, schemas: Record<string, ModelSchema>, endpoint?: string) {
    const resolvedEndpoint = endpoint ?? `${globalThis.window?.location.origin ?? ''}/api/v1/tenant/graphql/v5`;
    this.graphql = new GraphQLClient('', resolvedEndpoint);
    this.referenceId = referenceId;
    this.graphPrefix = referenceIdToGraphPrefix(referenceId);
    this.schemaMap = new Map(Object.entries(schemas));
  }

// replace the private `execute` method body:
  private execute<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    return this.graphql.execute<T>(query, variables);
  }
```

Remove all header construction, fetch call, and response parsing from the resolver — those now live
in `GraphQLClient`/`HttpClient`.

- [ ] **Step 4.3: Update existing resolver tests to mock `GraphQLClient` rather than `fetch`**

This is a refactor of existing tests, not new tests. Read `tests/data/GraphQLResolver.test.ts` and
replace the `globalThis.fetch` mock pattern with a `vi.mock('../../src/data/GraphQLClient.js', ...)`
or a direct injection — whichever requires fewer line changes. Recommended pattern:

```ts
import { vi } from 'vitest';
import { GraphQLClient } from '../../src/data/GraphQLClient.js';

vi.mock('../../src/data/GraphQLClient.js', () => ({
  GraphQLClient: vi.fn().mockImplementation(() => ({ execute: vi.fn() })),
}));

// per test:
const executeMock = vi.fn().mockResolvedValue({
  /* expected GraphQL data envelope */
});
vi.mocked(GraphQLClient).mockImplementation(() => ({ execute: executeMock }) as never);
```

Each existing assertion that previously matched the URL passed to fetch should now match the **query
string** passed to `executeMock`. URL-level assertions can be removed (the URL lives in
`GraphQLClient`'s tests now).

- [ ] **Step 4.4: Run resolver tests; confirm green**

```bash
npx vitest run tests/data/GraphQLResolver.test.ts
```

Expected: all existing assertions green.

- [ ] **Step 4.5: Run full data-folder tests to confirm no regressions**

```bash
npx vitest run tests/data
```

Expected: all green.

- [ ] **Step 4.6: Commit**

```bash
git add src/data/GraphQLResolver.ts tests/data/GraphQLResolver.test.ts
git commit -m "refactor(data): GraphQLResolver delegates transport to GraphQLClient"
```

---

### Task 5: Extend `DataProvider` + add `useRequest`

**Files:**

- Modify: `src/data/DataContext.tsx`
- Modify: `tests/data/useQuery.test.tsx` (only if updated context value type breaks existing tests;
  otherwise no change)
- Create: `src/data/useRequest.ts`
- Create: `tests/data/useRequest.test.tsx`

- [ ] **Step 5.1: Update `DataContext.tsx` to accept an optional `client` and an optional
      `resolver`**

Replace `src/data/DataContext.tsx`:

```tsx
import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';
import type { DataResolver } from './resolver.js';
import type { RestClient } from './RestClient.js';

interface DataContextValue {
  resolver: DataResolver | null;
  client: RestClient | null;
  invalidationKey: number;
  invalidate: (model: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export interface DataProviderProps {
  resolver?: DataResolver;
  client?: RestClient;
  children: ReactNode;
}

export function DataProvider({ resolver, client, children }: DataProviderProps) {
  const [invalidationKey, setInvalidationKey] = useState(0);

  const invalidate = useCallback((_model: string) => {
    setInvalidationKey((k) => k + 1);
  }, []);

  return (
    <DataContext.Provider
      value={{
        resolver: resolver ?? null,
        client: client ?? null,
        invalidationKey,
        invalidate,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useDataContext(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
}
```

- [ ] **Step 5.2: Update `useQuery.ts` to throw if `resolver` is null**

Edit `src/data/useQuery.ts`. After the `const { resolver, invalidationKey } = useDataContext();`
line, add:

```ts
if (!resolver) {
  throw new Error('useQuery requires a `resolver` on DataProvider');
}
```

- [ ] **Step 5.3: Apply the same guard in `useMutation.ts`**

Edit `src/data/useMutation.ts`. After `const { resolver, invalidate } = useDataContext();`, add:

```ts
if (!resolver) {
  throw new Error('useMutation requires a `resolver` on DataProvider');
}
```

- [ ] **Step 5.4: Run existing tests; confirm green**

```bash
npx vitest run tests/data
```

Expected: existing `useQuery`/`useMutation` tests still pass (they pass `resolver` to
`DataProvider`).

- [ ] **Step 5.5: Write failing tests for `useRequest`**

Create `tests/data/useRequest.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { DataProvider } from '../../src/data/DataContext.js';
import { RestClient } from '../../src/data/RestClient.js';
import { useRequest } from '../../src/data/useRequest.js';
import { HttpClient } from '../../src/data/HttpClient.js';

function makeWrapper(client: RestClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <DataProvider client={client}>{children}</DataProvider>;
  };
}

function fakeRestClient(impl: () => Promise<unknown>): RestClient {
  const http = { request: vi.fn().mockImplementation(impl) } as unknown as HttpClient;
  return new RestClient(http);
}

describe('useRequest', () => {
  describe('lifecycle', () => {
    it('starts in loading state', () => {
      const client = fakeRestClient(() => new Promise(() => {}));
      const { result } = renderHook(() => useRequest('/x'), { wrapper: makeWrapper(client) });
      expect(result.current.loading).toBe(true);
    });

    it('populates data when the request resolves', async () => {
      const client = fakeRestClient(() => Promise.resolve({ name: 'Ada' }));
      const { result } = renderHook(() => useRequest<{ name: string }>('/x'), {
        wrapper: makeWrapper(client),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.data).toEqual({ name: 'Ada' });
    });

    it('populates error when the request rejects', async () => {
      const client = fakeRestClient(() => Promise.reject(new Error('boom')));
      const { result } = renderHook(() => useRequest('/x'), { wrapper: makeWrapper(client) });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error?.message).toBe('boom');
    });
  });

  describe('skip', () => {
    it('does not fetch when skip is true', async () => {
      const impl = vi.fn().mockResolvedValue({});
      const client = fakeRestClient(impl);
      renderHook(() => useRequest('/x', { skip: true }), { wrapper: makeWrapper(client) });
      await new Promise((r) => setTimeout(r, 0));
      expect(impl).not.toHaveBeenCalled();
    });
  });

  describe('refetch', () => {
    it('issues a new request when refetch is called', async () => {
      const impl = vi.fn().mockResolvedValue({ n: 1 });
      const client = fakeRestClient(impl);
      const { result } = renderHook(() => useRequest('/x'), { wrapper: makeWrapper(client) });
      await waitFor(() => expect(result.current.loading).toBe(false));
      await act(async () => {
        await result.current.refetch();
      });
      expect(impl).toHaveBeenCalledTimes(2);
    });
  });

  describe('missing provider client', () => {
    it('throws a clear error if DataProvider has no client', () => {
      function Wrapper({ children }: { children: ReactNode }) {
        return <DataProvider>{children}</DataProvider>;
      }
      expect(() => renderHook(() => useRequest('/x'), { wrapper: Wrapper })).toThrow(/client/);
    });
  });
});
```

- [ ] **Step 5.6: Run tests; confirm they fail (module not found)**

```bash
npx vitest run tests/data/useRequest.test.tsx
```

- [ ] **Step 5.7: Implement `useRequest`**

Create `src/data/useRequest.ts`:

```ts
import { useState, useEffect, useCallback } from 'react';
import { useDataContext } from './DataContext.js';

export interface UseRequestOptions {
  skip?: boolean;
}

export interface RequestResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useRequest<T>(path: string, options: UseRequestOptions = {}): RequestResult<T> {
  const { client } = useDataContext();
  if (!client) {
    throw new Error('useRequest requires a `client` on DataProvider');
  }

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!options.skip);
  const [error, setError] = useState<Error | null>(null);

  const skip = options.skip ?? false;

  const fetchData = useCallback(async () => {
    if (skip) return;
    setLoading(true);
    setError(null);
    try {
      const result = await client.get<T>(path);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [client, path, skip]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
```

- [ ] **Step 5.8: Run tests; confirm green**

```bash
npx vitest run tests/data
```

Expected: all data tests pass.

- [ ] **Step 5.9: Commit**

```bash
git add src/data/DataContext.tsx src/data/useQuery.ts src/data/useMutation.ts src/data/useRequest.ts tests/data/useRequest.test.tsx
git commit -m "feat(data): add useRequest hook and optional client on DataProvider"
```

---

### Task 6: Dev-server transparent proxy at `/api/v1/tenant/*`

**Files:**

- Modify: `cli/src/data/vite-data-plugin.ts`
- Create: `cli/src/data/proxy-forwarder.ts`
- Create: `cli/tests/data/proxy-forwarder.test.ts`
- Delete: `cli/src/data/graphql-handler.ts`, `cli/src/data/local-store.ts`,
  `cli/tests/data/graphql-handler.test.ts`

- [ ] **Step 6.1: Read existing dev-server auth/token plumbing**

Read `cli/src/data/proxy-auth.ts`, `cli/src/commands/everywhere/auth/login.ts`, and any
token-storage helper they reference. Identify:

- How to read the stored bearer token at request time (sync or async).
- How to read host (`gateway`) and tenant from the same store.

Capture the exact import paths in notes for Step 6.3.

- [ ] **Step 6.2: Write failing tests for the path-transform helper**

Create `cli/tests/data/proxy-forwarder.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { rewriteTenantPath } from '../../src/data/proxy-forwarder.js';

describe('rewriteTenantPath', () => {
  describe('REST path', () => {
    it('strips /api/v1/tenant/ and injects tenant after the version', () => {
      const out = rewriteTenantPath('/api/v1/tenant/common/v1/workers/me', 'acmeco');
      expect(out).toBe('/ccx/api/common/v1/acmeco/workers/me');
    });
  });

  describe('GraphQL path', () => {
    it('appends tenant when the path ends at the version', () => {
      const out = rewriteTenantPath('/api/v1/tenant/graphql/v5', 'acmeco');
      expect(out).toBe('/ccx/api/graphql/v5/acmeco');
    });
  });

  describe('rejection', () => {
    it('returns null for paths outside the proxy prefix', () => {
      expect(rewriteTenantPath('/other/path', 'acmeco')).toBeNull();
    });

    it('returns null when there are fewer than two segments after the prefix', () => {
      expect(rewriteTenantPath('/api/v1/tenant/onlyone', 'acmeco')).toBeNull();
    });
  });
});
```

- [ ] **Step 6.3: Confirm tests fail**

```bash
npx vitest run cli/tests/data/proxy-forwarder.test.ts
```

- [ ] **Step 6.4: Implement the path-transform helper plus the forwarder middleware**

Create `cli/src/data/proxy-forwarder.ts`:

```ts
import type { IncomingMessage, ServerResponse } from 'node:http';

const TENANT_PREFIX = '/api/v1/tenant/';

/**
 * Transforms a plugin-facing proxy path into the canonical upstream Workday path.
 *
 * Plugin calls    /api/v1/tenant/<service>/<version>[/<rest>]
 * Forwarded to    /ccx/api/<service>/<version>/<tenant>[/<rest>]
 *
 * Returns null for paths that don't match the proxy prefix or are too short to
 * carry a service + version pair.
 */
export function rewriteTenantPath(path: string, tenant: string): string | null {
  if (!path.startsWith(TENANT_PREFIX)) return null;
  const rest = path.slice(TENANT_PREFIX.length);
  const segments = rest.split('/');
  if (segments.length < 2) return null;
  const [service, version, ...remainder] = segments;
  const tail = remainder.length > 0 ? `/${remainder.join('/')}` : '';
  return `/ccx/api/${service}/${version}/${tenant}${tail}`;
}

interface ForwarderConfig {
  gateway: string; // e.g. https://impl.workday.com
  tenant: string;
  getToken: () => Promise<string | null>;
}

export function createTenantForwarder(config: ForwarderConfig) {
  return async function forward(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const incomingPath = req.url ?? '/';
    const rewritten = rewriteTenantPath(incomingPath, config.tenant);
    if (!rewritten) {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: `unrecognised proxy path: ${incomingPath}` }));
      return;
    }

    const token = await config.getToken();
    if (!token) {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'no stored auth token — run: npx @workday/everywhere auth login',
        })
      );
      return;
    }

    const body = await readBody(req);
    const upstreamUrl = `${config.gateway}${rewritten}`;

    const headers: Record<string, string> = {
      authorization: `Bearer ${token}`,
      accept: req.headers['accept'] ?? 'application/json',
    };
    const contentType = req.headers['content-type'];
    if (typeof contentType === 'string') headers['content-type'] = contentType;

    let upstream: Response;
    try {
      upstream = await fetch(upstreamUrl, {
        method: req.method ?? 'GET',
        headers,
        body: body.length > 0 ? body : undefined,
      });
    } catch (err) {
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: `upstream fetch failed: ${(err as Error).message}` }));
      return;
    }

    const responseBody = await upstream.text();
    const responseContentType = upstream.headers.get('content-type') ?? 'application/json';
    res.writeHead(upstream.status, { 'content-type': responseContentType });
    res.end(responseBody);
  };
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
```

- [ ] **Step 6.5: Run helper tests; confirm green**

```bash
npx vitest run cli/tests/data/proxy-forwarder.test.ts
```

Expected: 4 passes.

- [ ] **Step 6.6: Add forwarder behavior tests (using a mocked global `fetch`)**

The forwarder uses `globalThis.fetch` to call upstream Workday. Tests mock that instead of standing
up a local server — simpler, deterministic, no race conditions.

Append to `cli/tests/data/proxy-forwarder.test.ts`:

```ts
import type { IncomingMessage, ServerResponse } from 'node:http';
import { vi, afterEach } from 'vitest';
import { createTenantForwarder } from '../../src/data/proxy-forwarder.js';

interface FakeRes {
  res: ServerResponse;
  status: () => number;
  headers: () => Record<string, string>;
  body: () => string;
}

function fakeResponse(): FakeRes {
  let status = 0;
  let body = '';
  let headers: Record<string, string> = {};
  const res = {
    writeHead(s: number, h?: Record<string, string>) {
      status = s;
      if (h) headers = h;
      return res;
    },
    end(b?: string) {
      body = b ?? '';
      return res;
    },
    setHeader() {},
  } as unknown as ServerResponse;
  return { res, status: () => status, headers: () => headers, body: () => body };
}

function fakeRequest(opts: {
  method: string;
  url: string;
  body?: string;
  headers?: Record<string, string>;
}): IncomingMessage {
  const listeners: Record<string, ((arg: unknown) => void)[]> = {};
  const req = {
    method: opts.method,
    url: opts.url,
    headers: opts.headers ?? {},
    on(event: string, cb: (arg: unknown) => void) {
      listeners[event] = listeners[event] ?? [];
      listeners[event].push(cb);
      return req;
    },
  } as unknown as IncomingMessage;
  setImmediate(() => {
    if (opts.body) listeners['data']?.forEach((l) => l(Buffer.from(opts.body!)));
    listeners['end']?.forEach((l) => l(undefined));
  });
  return req;
}

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockFetch(
  impl: (url: string, init: RequestInit) => Promise<Response>
): ReturnType<typeof vi.fn> {
  const mock = vi.fn().mockImplementation(impl);
  globalThis.fetch = mock as unknown as typeof fetch;
  return mock;
}

function okResponse(body = '{}'): Response {
  return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
}

describe('createTenantForwarder', () => {
  describe('upstream forwarding', () => {
    it('rewrites the path before calling upstream', async () => {
      const fetchMock = mockFetch(async () => okResponse());
      const forwarder = createTenantForwarder({
        gateway: 'https://impl.example',
        tenant: 'acmeco',
        getToken: async () => 'tok',
      });
      const { res } = fakeResponse();
      await forwarder(
        fakeRequest({ method: 'GET', url: '/api/v1/tenant/common/v1/workers/me' }),
        res
      );
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        'https://impl.example/ccx/api/common/v1/acmeco/workers/me'
      );
    });

    it('forwards the HTTP method', async () => {
      const fetchMock = mockFetch(async () => okResponse());
      const forwarder = createTenantForwarder({
        gateway: 'https://impl.example',
        tenant: 'acmeco',
        getToken: async () => 'tok',
      });
      const { res } = fakeResponse();
      await forwarder(
        fakeRequest({ method: 'POST', url: '/api/v1/tenant/common/v1/workers/me', body: '{}' }),
        res
      );
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(init.method).toBe('POST');
    });

    it('passes upstream status through to the response', async () => {
      mockFetch(async () => new Response('{"err":true}', { status: 418 }));
      const forwarder = createTenantForwarder({
        gateway: 'https://impl.example',
        tenant: 'acmeco',
        getToken: async () => 'tok',
      });
      const { res, status } = fakeResponse();
      await forwarder(
        fakeRequest({ method: 'GET', url: '/api/v1/tenant/common/v1/workers/me' }),
        res
      );
      expect(status()).toBe(418);
    });
  });

  describe('auth header', () => {
    it('injects Authorization: Bearer <token>', async () => {
      const fetchMock = mockFetch(async () => okResponse());
      const forwarder = createTenantForwarder({
        gateway: 'https://impl.example',
        tenant: 'acmeco',
        getToken: async () => 'my-token',
      });
      const { res } = fakeResponse();
      await forwarder(
        fakeRequest({ method: 'GET', url: '/api/v1/tenant/common/v1/workers/me' }),
        res
      );
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer my-token');
    });
  });

  describe('missing token', () => {
    it('responds 401 without contacting upstream', async () => {
      const fetchMock = mockFetch(async () => okResponse());
      const forwarder = createTenantForwarder({
        gateway: 'https://impl.example',
        tenant: 'acmeco',
        getToken: async () => null,
      });
      const { res, status } = fakeResponse();
      await forwarder(
        fakeRequest({ method: 'GET', url: '/api/v1/tenant/common/v1/workers/me' }),
        res
      );
      expect(status()).toBe(401);
    });

    it('does not call fetch when token is missing', async () => {
      const fetchMock = mockFetch(async () => okResponse());
      const forwarder = createTenantForwarder({
        gateway: 'https://impl.example',
        tenant: 'acmeco',
        getToken: async () => null,
      });
      const { res } = fakeResponse();
      await forwarder(
        fakeRequest({ method: 'GET', url: '/api/v1/tenant/common/v1/workers/me' }),
        res
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('upstream failure', () => {
    it('responds 502 when fetch rejects', async () => {
      mockFetch(async () => {
        throw new Error('connection refused');
      });
      const forwarder = createTenantForwarder({
        gateway: 'https://impl.example',
        tenant: 'acmeco',
        getToken: async () => 'tok',
      });
      const { res, status } = fakeResponse();
      await forwarder(
        fakeRequest({ method: 'GET', url: '/api/v1/tenant/common/v1/workers/me' }),
        res
      );
      expect(status()).toBe(502);
    });
  });
});
```

- [ ] **Step 6.7: Run forwarder tests; confirm green**

```bash
npx vitest run cli/tests/data/proxy-forwarder.test.ts
```

- [ ] **Step 6.8: Repoint `vite-data-plugin.ts` to mount the new forwarder; delete mock files**

Read `cli/src/data/proxy-auth.ts`, `cli/src/commands/everywhere/auth/login.ts` (and any
token-store/config module) to find the actual helpers for reading the stored token, gateway URL, and
tenant. Then replace the contents of `cli/src/data/vite-data-plugin.ts` with a middleware that
delegates `/api/v1/tenant` traffic to `createTenantForwarder`. Approximate shape (adapt to actual
storage helpers found in this step):

```ts
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createTenantForwarder } from './proxy-forwarder.js';
// import { readStoredAuth } from '...';   // <-- the helper used by `auth login`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VitePlugin = any;

export function dataServicePlugin(_pluginDir: string): VitePlugin {
  return {
    name: 'workday-everywhere-data',
    configureServer(server: { middlewares: { use: (...args: unknown[]) => void } }) {
      server.middlewares.use(
        '/api/v1/tenant',
        async (req: IncomingMessage, res: ServerResponse) => {
          const auth = await readStoredAuth(); // shape: { gateway, tenant, token }
          const forwarder = createTenantForwarder({
            gateway: auth.gateway,
            tenant: auth.tenant,
            getToken: async () => auth.token,
          });
          await forwarder(req, res);
        }
      );
    },
  };
}
```

Then delete:

```bash
rm cli/src/data/graphql-handler.ts cli/src/data/local-store.ts cli/tests/data/graphql-handler.test.ts
```

- [ ] **Step 6.9: Run full CLI test suite; confirm nothing else referenced the deleted files**

```bash
npx vitest run cli/tests
```

Expected: green. If any test imports `graphql-handler` or `local-store`, delete or update that test
as part of this same task.

- [ ] **Step 6.10: Commit**

```bash
git add cli/src/data/proxy-forwarder.ts cli/src/data/vite-data-plugin.ts cli/tests/data/proxy-forwarder.test.ts
git add -u cli/src/data/graphql-handler.ts cli/src/data/local-store.ts cli/tests/data/graphql-handler.test.ts
git commit -m "feat(cli): replace local GraphQL mock with /api/v1/tenant/* forwarder"
```

---

### Task 7: Rewrite the `directory` example

**Files:**

- Rewrite: `examples/directory/plugin.tsx`
- Rewrite: `examples/directory/routes.ts`
- Rewrite: `examples/directory/pages/Home.tsx`
- Delete: `examples/directory/pages/EmployeeList.tsx`, `EmployeeDetail.tsx`, `Spotlight.tsx`,
  `examples/directory/model/`

- [ ] **Step 7.1: Replace `plugin.tsx`**

Overwrite `examples/directory/plugin.tsx`:

```tsx
import { type ReactNode } from 'react';
import { plugin, DataProvider, RestClient } from '@workday/everywhere';
import { CanvasProvider } from '@workday/canvas-kit-react';
import { home } from './routes.js';

const client = new RestClient('/api/v1/tenant');

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

- [ ] **Step 7.2: Replace `routes.ts`**

Overwrite `examples/directory/routes.ts`:

```ts
import { route } from '@workday/everywhere';
import HomePage from './pages/Home.js';

export const home = route('home', { component: HomePage });
```

- [ ] **Step 7.3: Rewrite `pages/Home.tsx`**

Overwrite `examples/directory/pages/Home.tsx`:

```tsx
import { useRequest } from '@workday/everywhere';
import { Card } from '@workday/canvas-kit-react/card';

interface Worker {
  descriptor: string;
}

export default function Home() {
  const { data, loading, error } = useRequest<Worker>('/common/v1/workers/me');

  if (loading)
    return (
      <Card>
        <Card.Body>Loading…</Card.Body>
      </Card>
    );
  if (error)
    return (
      <Card>
        <Card.Body>Error: {error.message}</Card.Body>
      </Card>
    );
  return (
    <Card>
      <Card.Heading>Me</Card.Heading>
      <Card.Body>{data?.descriptor ?? 'No worker descriptor returned.'}</Card.Body>
    </Card>
  );
}
```

- [ ] **Step 7.4: Delete obsolete files**

```bash
rm examples/directory/pages/EmployeeList.tsx examples/directory/pages/EmployeeDetail.tsx examples/directory/pages/Spotlight.tsx
rm -rf examples/directory/model
```

- [ ] **Step 7.5: Run example typecheck**

```bash
cd examples && npx tsc --noEmit -p tsconfig.json
```

Expected: no errors. If Canvas Kit's `Card` API differs from what's shown above, adjust the
imports/JSX to match the version pinned in this repo — the surface compositional API of canvas-kit
`Card` is what matters, not the exact prop names.

- [ ] **Step 7.6: Commit**

```bash
git add examples/directory
git commit -m "refactor(examples): directory example becomes a single /workers/me card"
```

---

### Task 8: Remove `HttpResolver`, update public exports, audit remaining examples

**Files:**

- Delete: `src/data/HttpResolver.ts`, `tests/data/resolver.test.ts`
- Modify: `src/data/index.ts`
- Delete and/or rewrite: `examples/charitable-donations/`, `examples/work-events/`,
  `examples/create-work-event/`

- [ ] **Step 8.1: Replace `src/data/index.ts`**

Overwrite `src/data/index.ts`:

```ts
export type {
  FieldType,
  FieldSchema,
  GraphFieldMeta,
  GraphInputFieldMeta,
  GraphMetadata,
  ModelSchema,
  CurrencyValue,
} from './types.js';
export type { DataResolver } from './resolver.js';

export { HttpClient, HttpError, HttpAuthError } from './HttpClient.js';
export type { HttpRequestOptions } from './HttpClient.js';

export { RestClient } from './RestClient.js';
export type { RestRequestOptions } from './RestClient.js';

export { GraphQLClient } from './GraphQLClient.js';
export { GraphQLResolver } from './GraphQLResolver.js';

export { DataProvider } from './DataContext.js';
export type { DataProviderProps } from './DataContext.js';

export { useQuery } from './useQuery.js';
export type { QueryOptions, QueryResult } from './useQuery.js';

export { useMutation } from './useMutation.js';
export type { MutationResult } from './useMutation.js';

export { useRequest } from './useRequest.js';
export type { RequestResult, UseRequestOptions } from './useRequest.js';
```

- [ ] **Step 8.2: Delete `HttpResolver` and its tests**

```bash
rm src/data/HttpResolver.ts tests/data/resolver.test.ts
```

- [ ] **Step 8.3: Audit remaining examples**

For each of `examples/charitable-donations`, `examples/work-events`, `examples/create-work-event`:

- Inspect imports. If the example uses `HttpResolver` and depends on the now-removed local mock,
  **delete the example directory** outright. (Per design: "remove or convert to real proxy calls
  where a clean real-data analog exists; otherwise remove.") None of these have a clean real-data
  analog without significant per-example design work.
- `examples/hello` has no data calls; leave untouched.

```bash
rm -rf examples/charitable-donations examples/work-events examples/create-work-event
```

If any example references these directories from a top-level config (e.g., `examples/tsconfig.json`
`references`, or a `pnpm-workspace.yaml`), update it accordingly.

- [ ] **Step 8.4: Run full repo check**

```bash
npx tsc --noEmit
npx eslint src/ cli/src/
npx vitest run --exclude ".worktrees/**"
cd examples && npx tsc --noEmit -p tsconfig.json
```

Expected: all green. If `examples/tsconfig.json` lists references to removed examples, remove those
entries.

- [ ] **Step 8.5: Commit**

```bash
git add src/data/index.ts examples
git add -u src/data/HttpResolver.ts tests/data/resolver.test.ts examples/charitable-donations examples/work-events examples/create-work-event
git commit -m "feat(data)!: remove HttpResolver and mock-bound examples"
```

> Note the `!` in the commit type — this commit contains the only intentional public-API removal in
> the change.

---

### Task 9: Final verification

**Files:** none changed.

- [ ] **Step 9.1: Run `just check`**

```bash
just check
```

Expected: all green.

- [ ] **Step 9.2: Run `just test`**

```bash
just test
```

Expected: all green.

- [ ] **Step 9.3: Run `just tidy` and re-`just check`**

```bash
just tidy
just check
```

Expected: no diff after `tidy`, all checks pass. If `tidy` produces changes, commit them with
`style: prettier`.

- [ ] **Step 9.4: Confirm the directory example loads through the dev server with a real token**

Manual smoke test — record the result in the PR description, not a commit:

1. Run `npx @workday/everywhere auth login` against a real Workday tenant (if not already done).
2. Start the directory example dev server (per `cli/src/commands/everywhere/view.ts` — typically
   `npx @workday/everywhere view examples/directory` or whatever the documented command is).
3. Open the app in a browser; confirm the `/me` card renders the worker descriptor.

If the response shape needs a different field than `descriptor`, update `pages/Home.tsx` and the
`Worker` interface in a follow-up commit on this same branch.

- [ ] **Step 9.5: Open PR**

Push the branch and open a PR to `main` with a summary that highlights:

- The shared `HttpClient` transport and the `RestClient` / `GraphQLClient` primitives.
- The `/api/v1/tenant/*` dev-server forwarder replacing the local mock.
- The removal of `HttpResolver` (only intentional public-API break).
- The directory example showing real `/workers/me` data.

---

## Self-Review

**Spec coverage:** every section of the spec maps to a task:

- HttpClient → Task 1
- RestClient → Task 2
- GraphQLClient → Task 3
- GraphQLResolver refactor + new default endpoint → Task 4
- useRequest + DataProvider extension → Task 5
- Dev-server proxy + mock removal → Task 6
- Directory example rewrite → Task 7
- HttpResolver removal + exports + other example audit → Task 8
- Final verification → Task 9

**Open questions from the spec** are explicitly deferred to implementation time and handled in Task
9.4 (worker response shape) and Task 8.3 (per-example disposition).

**Placeholder scan:** No "TBD", "implement later", or empty steps. The forwarder middleware in Step
6.8 says "adapt to actual storage helpers found in this step" — that's an instruction to read
concrete code, not a placeholder. Step 9.4's `view examples/directory` command is qualified with
"per `cli/src/commands/everywhere/view.ts`" so the implementor verifies it.

**Type consistency:** `RestClient` constructor accepts `HttpClient | string` consistently across
Task 2 and Task 5. `GraphQLClient` constructor signature is identical in Task 3 and Task 4.
`DataProviderProps` field name (`client`) consistent in Tasks 5, 7, and the spec.

**Note:** Step 6.6 mocks global `fetch` rather than standing up a local upstream server. This keeps
tests deterministic, removes timing races, and matches the pattern used by `HttpClient.test.ts`.
