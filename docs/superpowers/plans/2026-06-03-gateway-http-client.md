# GatewayClient Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the duplicated fetch + auth + error-handling + verbose-logging pattern across
CLI commands into a single `GatewayClient`, then migrate all five call sites onto it.

**Architecture:** A single `GatewayClient` class (`cli/src/gateway/client.ts`) with a small public
surface (`getJson` / `postJson` / `delete` / `getText` / `request`) and one `GatewayRequestError`
type. The client owns transport concerns and verbose logging; commands keep domain validation and
command-level logging.

**Tech Stack:** TypeScript, vitest, oclif, Node `fetch`

**Spec:** `docs/superpowers/specs/2026-06-03-gateway-http-client-design.md`

**Working directory:** `.worktrees/chatty-chameleon` (branch `feat/auth-verbose-logging`)

All file paths below are relative to the worktree root.

## File Structure

**Created:**

- `cli/src/gateway/client.ts` — `GatewayClient` class, `GatewayRequestError`, `VerboseLogger`
  interface, internal `describeFetchError` helper
- `cli/tests/gateway/client.test.ts` — unit tests for all client behavior

**Modified:**

- `cli/src/commands/everywhere/auth/login.ts` — switch to `client.getJson`, drop local fetch +
  helpers
- `cli/src/commands/everywhere/auth/token.ts` — switch to `client.getText`
- `cli/src/registry/registry.ts` — switch publish to `client.request` (binary blob), unpublish to
  `client.delete`
- `cli/src/codegen/introspect.ts` — switch to `client.request`, map `GatewayRequestError` to Result
- `cli/tests/commands/everywhere/auth/login.test.ts` — replace fetch mocks with client mocks
- `cli/tests/commands/everywhere/auth/token.test.ts` — same
- `cli/tests/registry/registry.test.ts` — same
- `cli/tests/registry/registry-delete.test.ts` — same
- `cli/tests/codegen/introspect.test.ts` — same

---

## Task 1: GatewayRequestError and client skeleton

**Files:**

- Create: `cli/src/gateway/client.ts`
- Create: `cli/tests/gateway/client.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `cli/tests/gateway/client.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { GatewayClient, GatewayRequestError } from '../../src/gateway/client.js';

describe('GatewayRequestError', () => {
  it('carries the method and url', () => {
    const err = new GatewayRequestError('boom', {
      method: 'GET',
      url: 'https://api.example.com/x',
    });

    expect(err.method).toBe('GET');
  });

  it('carries the url', () => {
    const err = new GatewayRequestError('boom', {
      method: 'GET',
      url: 'https://api.example.com/x',
    });

    expect(err.url).toBe('https://api.example.com/x');
  });

  it('carries the status when provided', () => {
    const err = new GatewayRequestError('boom', {
      method: 'GET',
      url: 'https://api.example.com/x',
      status: 401,
    });

    expect(err.status).toBe(401);
  });

  it('carries the code when provided', () => {
    const err = new GatewayRequestError('boom', {
      method: 'GET',
      url: 'https://api.example.com/x',
      code: 'ECONNREFUSED',
    });

    expect(err.code).toBe('ECONNREFUSED');
  });
});

describe('GatewayClient', () => {
  describe('construction', () => {
    it('can be constructed with gateway and token', () => {
      const client = new GatewayClient({
        gateway: 'https://api.example.com',
        token: 'tok',
      });

      expect(client).toBeInstanceOf(GatewayClient);
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run cli/tests/gateway/client.test.ts
```

Expected: FAIL — `client.ts` doesn't exist yet.

- [ ] **Step 3: Create the skeleton**

Create `cli/src/gateway/client.ts`:

```typescript
export interface VerboseLogger {
  readonly isVerbose: boolean;
  log(message: string): void;
}

export interface ClientOptions {
  gateway: string;
  token: string;
  logger?: VerboseLogger;
}

export interface GatewayRequestErrorFields {
  method: string;
  url: string;
  status?: number;
  code?: string;
  cause?: Error;
}

export class GatewayRequestError extends Error {
  readonly method: string;
  readonly url: string;
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, fields: GatewayRequestErrorFields) {
    super(message, fields.cause ? { cause: fields.cause } : undefined);
    this.name = 'GatewayRequestError';
    this.method = fields.method;
    this.url = fields.url;
    this.status = fields.status;
    this.code = fields.code;
  }
}

export class GatewayClient {
  private readonly gateway: string;
  private readonly token: string;
  private readonly logger?: VerboseLogger;

  constructor(opts: ClientOptions) {
    this.gateway = opts.gateway;
    this.token = opts.token;
    this.logger = opts.logger;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run cli/tests/gateway/client.test.ts
```

Expected: PASS for all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add cli/src/gateway/client.ts cli/tests/gateway/client.test.ts
git commit -m "feat(gateway): add GatewayRequestError and GatewayClient skeleton"
```

---

## Task 2: `request()` happy path — URL building, bearer auth, status check

**Files:**

- Modify: `cli/src/gateway/client.ts` (add `request` method)
- Modify: `cli/tests/gateway/client.test.ts` (add `request` tests)

- [ ] **Step 1: Write the failing tests**

Add at the end of `cli/tests/gateway/client.test.ts` (before the closing brace of the file), inside
the existing `describe('GatewayClient', ...)`:

```typescript
describe('request', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('joins the path onto the gateway URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new GatewayClient({
      gateway: 'https://api.example.com',
      token: 'tok',
    });

    await client.request({ method: 'GET', path: '/api/v1/me' });

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/api/v1/me', expect.anything());
  });

  it('sends a bearer authorization header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new GatewayClient({
      gateway: 'https://api.example.com',
      token: 'tok-abc',
    });

    await client.request({ method: 'GET', path: '/x' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok-abc' }),
      })
    );
  });

  it('returns the raw Response on success', async () => {
    const response = new Response('hi', { status: 200 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

    const result = await client.request({ method: 'GET', path: '/x' });

    expect(result).toBe(response);
  });

  it('throws GatewayRequestError with status when response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('nope', { status: 401, statusText: 'Unauthorized' }))
    );
    const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

    await expect(client.request({ method: 'GET', path: '/x' })).rejects.toMatchObject({
      name: 'GatewayRequestError',
      method: 'GET',
      url: 'https://api.example.com/x',
      status: 401,
    });
  });
});
```

Also add this to the imports at the top of the test file:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
```

(Replace the existing `import { describe, expect, it } from 'vitest';`.)

- [ ] **Step 2: Run new tests to verify they fail**

```bash
npx vitest run cli/tests/gateway/client.test.ts -t "request"
```

Expected: FAIL — `request` method does not exist.

- [ ] **Step 3: Implement `request()` in `client.ts`**

Add the following inside the `GatewayClient` class (after the constructor):

```typescript
  async request(opts: {
    method: 'GET' | 'POST' | 'DELETE';
    path: string;
    body?: BodyInit;
    headers?: Record<string, string>;
  }): Promise<Response> {
    const url = new URL(opts.path, this.gateway).toString();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      ...(opts.headers ?? {}),
    };

    const response = await fetch(url, {
      method: opts.method,
      headers,
      body: opts.body,
    });

    if (!response.ok) {
      throw new GatewayRequestError(
        `${opts.method} ${url} failed: HTTP ${response.status} ${response.statusText}`,
        { method: opts.method, url, status: response.status }
      );
    }

    return response;
  }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run cli/tests/gateway/client.test.ts
```

Expected: PASS for all tests including the 4 new `request` tests.

- [ ] **Step 5: Commit**

```bash
git add cli/src/gateway/client.ts cli/tests/gateway/client.test.ts
git commit -m "feat(gateway): implement request() happy path with bearer auth and status check"
```

---

## Task 3: `request()` network error handling with cause unwrap

**Files:**

- Modify: `cli/src/gateway/client.ts` (wrap fetch in try/catch, add `describeFetchError`)
- Modify: `cli/tests/gateway/client.test.ts` (add tests)

- [ ] **Step 1: Write the failing tests**

Add these tests inside `describe('request', ...)` after the existing tests:

```typescript
it('throws GatewayRequestError with code when fetch throws with a cause', async () => {
  const cause = Object.assign(new Error('unable to get local issuer certificate'), {
    code: 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  });
  const fetchErr = new TypeError('fetch failed', { cause });
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(fetchErr));
  const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

  await expect(client.request({ method: 'GET', path: '/x' })).rejects.toMatchObject({
    name: 'GatewayRequestError',
    method: 'GET',
    url: 'https://api.example.com/x',
    code: 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  });
});

it('formats the message with the unwrapped cause', async () => {
  const cause = Object.assign(new Error('unable to get local issuer certificate'), {
    code: 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  });
  const fetchErr = new TypeError('fetch failed', { cause });
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(fetchErr));
  const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

  await expect(client.request({ method: 'GET', path: '/x' })).rejects.toThrow(
    'GET https://api.example.com/x failed: UNABLE_TO_GET_ISSUER_CERT_LOCALLY: unable to get local issuer certificate'
  );
});

it('falls back to message when no code is present', async () => {
  const cause = new Error('socket hang up');
  const fetchErr = new TypeError('fetch failed', { cause });
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(fetchErr));
  const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

  await expect(client.request({ method: 'GET', path: '/x' })).rejects.toThrow(
    'GET https://api.example.com/x failed: socket hang up'
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run cli/tests/gateway/client.test.ts -t "request"
```

Expected: FAIL for the three new tests — current `request()` doesn't catch fetch errors.

- [ ] **Step 3: Add `describeFetchError` and wrap fetch in try/catch**

In `cli/src/gateway/client.ts`, add this module-level function above the `GatewayClient` class:

```typescript
function describeFetchError(err: unknown): { message: string; code?: string; cause: Error } {
  if (!(err instanceof Error)) {
    return { message: String(err), cause: new Error(String(err)) };
  }
  let current: Error = err;
  while (current.cause instanceof Error) {
    current = current.cause;
  }
  const code = (current as { code?: unknown }).code;
  const codeStr = typeof code === 'string' ? code : undefined;
  const message = codeStr ? `${codeStr}: ${current.message}` : current.message;
  return { message, code: codeStr, cause: err };
}
```

Then modify the `request()` method's fetch call to wrap it:

```typescript
  async request(opts: {
    method: 'GET' | 'POST' | 'DELETE';
    path: string;
    body?: BodyInit;
    headers?: Record<string, string>;
  }): Promise<Response> {
    const url = new URL(opts.path, this.gateway).toString();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      ...(opts.headers ?? {}),
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: opts.method,
        headers,
        body: opts.body,
      });
    } catch (err) {
      const described = describeFetchError(err);
      throw new GatewayRequestError(
        `${opts.method} ${url} failed: ${described.message}`,
        { method: opts.method, url, code: described.code, cause: described.cause }
      );
    }

    if (!response.ok) {
      throw new GatewayRequestError(
        `${opts.method} ${url} failed: HTTP ${response.status} ${response.statusText}`,
        { method: opts.method, url, status: response.status }
      );
    }

    return response;
  }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run cli/tests/gateway/client.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add cli/src/gateway/client.ts cli/tests/gateway/client.test.ts
git commit -m "feat(gateway): unwrap fetch error cause in request()"
```

---

## Task 4: Verbose logging in `request()`

**Files:**

- Modify: `cli/src/gateway/client.ts` (add verbose log calls)
- Modify: `cli/tests/gateway/client.test.ts` (add tests)

- [ ] **Step 1: Write the failing tests**

Add a new `describe` block inside `describe('GatewayClient', ...)`:

```typescript
describe('verbose logging', () => {
  function makeLogger(isVerbose = true) {
    return {
      isVerbose,
      log: vi.fn(),
    };
  }

  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('logs the method and url before the request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    const logger = makeLogger();
    const client = new GatewayClient({
      gateway: 'https://api.example.com',
      token: 'tok',
      logger,
    });

    await client.request({ method: 'GET', path: '/x' });

    expect(logger.log).toHaveBeenCalledWith('Requesting GET https://api.example.com/x');
  });

  it('logs the response status after the request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 200, statusText: 'OK' }))
    );
    const logger = makeLogger();
    const client = new GatewayClient({
      gateway: 'https://api.example.com',
      token: 'tok',
      logger,
    });

    await client.request({ method: 'GET', path: '/x' });

    expect(logger.log).toHaveBeenCalledWith('Response: 200 OK');
  });

  it('logs the failure message when fetch throws', async () => {
    const cause = Object.assign(new Error('boom'), { code: 'ETIMEDOUT' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed', { cause })));
    const logger = makeLogger();
    const client = new GatewayClient({
      gateway: 'https://api.example.com',
      token: 'tok',
      logger,
    });

    await client.request({ method: 'GET', path: '/x' }).catch(() => {});

    expect(logger.log).toHaveBeenCalledWith('Request failed: ETIMEDOUT: boom');
  });

  it('emits nothing when logger isVerbose is false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    const logger = makeLogger(false);
    const client = new GatewayClient({
      gateway: 'https://api.example.com',
      token: 'tok',
      logger,
    });

    await client.request({ method: 'GET', path: '/x' });

    expect(logger.log).not.toHaveBeenCalled();
  });

  it('emits nothing when no logger is provided', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

    // Should not throw despite having no logger
    await expect(client.request({ method: 'GET', path: '/x' })).resolves.toBeDefined();
  });
});
```

- [ ] **Step 2: Run new tests to verify they fail**

```bash
npx vitest run cli/tests/gateway/client.test.ts -t "verbose logging"
```

Expected: FAIL for first three tests (no logging calls happen yet); the "emits nothing" tests will
PASS already.

- [ ] **Step 3: Add verbose log calls in `request()`**

In `cli/src/gateway/client.ts`, modify the `request()` method to emit logs. Replace the entire
method body with:

```typescript
  async request(opts: {
    method: 'GET' | 'POST' | 'DELETE';
    path: string;
    body?: BodyInit;
    headers?: Record<string, string>;
  }): Promise<Response> {
    const url = new URL(opts.path, this.gateway).toString();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      ...(opts.headers ?? {}),
    };

    if (this.logger?.isVerbose) {
      this.logger.log(`Requesting ${opts.method} ${url}`);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: opts.method,
        headers,
        body: opts.body,
      });
    } catch (err) {
      const described = describeFetchError(err);
      if (this.logger?.isVerbose) {
        this.logger.log(`Request failed: ${described.message}`);
      }
      throw new GatewayRequestError(
        `${opts.method} ${url} failed: ${described.message}`,
        { method: opts.method, url, code: described.code, cause: described.cause }
      );
    }

    if (this.logger?.isVerbose) {
      this.logger.log(`Response: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      throw new GatewayRequestError(
        `${opts.method} ${url} failed: HTTP ${response.status} ${response.statusText}`,
        { method: opts.method, url, status: response.status }
      );
    }

    return response;
  }
```

- [ ] **Step 4: Run all client tests**

```bash
npx vitest run cli/tests/gateway/client.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add cli/src/gateway/client.ts cli/tests/gateway/client.test.ts
git commit -m "feat(gateway): emit verbose transport logs from client"
```

---

## Task 5: `getJson` and `getText` methods

**Files:**

- Modify: `cli/src/gateway/client.ts` (add `getJson` and `getText` methods)
- Modify: `cli/tests/gateway/client.test.ts` (add tests)

- [ ] **Step 1: Write the failing tests**

Add a new `describe` block inside `describe('GatewayClient', ...)`:

```typescript
describe('getJson', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the parsed JSON body on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ sub: 'u1', tenant: 't1' }), { status: 200 })
        )
    );
    const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

    const result = await client.getJson<{ sub: string; tenant: string }>('/api/v1/me');

    expect(result).toEqual({ sub: 'u1', tenant: 't1' });
  });

  it('throws GatewayRequestError when the body is not valid JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not-json', { status: 200 })));
    const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

    await expect(client.getJson('/x')).rejects.toThrow(
      'GET https://api.example.com/x failed: response was not valid JSON'
    );
  });
});

describe('getText', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the response body as text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('hello world', { status: 200 })));
    const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

    const result = await client.getText('/x');

    expect(result).toBe('hello world');
  });
});
```

- [ ] **Step 2: Run new tests to verify they fail**

```bash
npx vitest run cli/tests/gateway/client.test.ts -t "getJson|getText"
```

Expected: FAIL — methods don't exist.

- [ ] **Step 3: Implement the methods**

Add these methods inside the `GatewayClient` class after `request()`:

```typescript
  async getJson<T>(path: string): Promise<T> {
    const response = await this.request({ method: 'GET', path });
    try {
      return (await response.json()) as T;
    } catch (err) {
      const url = new URL(path, this.gateway).toString();
      throw new GatewayRequestError(`GET ${url} failed: response was not valid JSON`, {
        method: 'GET',
        url,
        cause: err instanceof Error ? err : undefined,
      });
    }
  }

  async getText(path: string): Promise<string> {
    const response = await this.request({ method: 'GET', path });
    return response.text();
  }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run cli/tests/gateway/client.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add cli/src/gateway/client.ts cli/tests/gateway/client.test.ts
git commit -m "feat(gateway): add getJson and getText methods"
```

---

## Task 6: `postJson` and `delete` methods

**Files:**

- Modify: `cli/src/gateway/client.ts` (add `postJson` and `delete` methods)
- Modify: `cli/tests/gateway/client.test.ts` (add tests)

- [ ] **Step 1: Write the failing tests**

Add these `describe` blocks inside `describe('GatewayClient', ...)`:

```typescript
describe('postJson', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('serializes the body as JSON with content-type header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

    await client.postJson('/x', { hello: 'world' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/x',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ hello: 'world' }),
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );
  });

  it('returns the parsed response on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'abc' }), { status: 200 }))
    );
    const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

    const result = await client.postJson<{ id: string }>('/x', {});

    expect(result).toEqual({ id: 'abc' });
  });
});

describe('delete', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('issues a DELETE request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

    await client.delete('/x');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/x',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('resolves when the status check passes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

    await expect(client.delete('/x')).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run new tests to verify they fail**

```bash
npx vitest run cli/tests/gateway/client.test.ts -t "postJson|delete"
```

Expected: FAIL — methods don't exist.

- [ ] **Step 3: Implement the methods**

Add inside the `GatewayClient` class after `getText()`:

```typescript
  async postJson<T>(path: string, body: unknown): Promise<T> {
    const response = await this.request({
      method: 'POST',
      path,
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
    try {
      return (await response.json()) as T;
    } catch (err) {
      const url = new URL(path, this.gateway).toString();
      throw new GatewayRequestError(`POST ${url} failed: response was not valid JSON`, {
        method: 'POST',
        url,
        cause: err instanceof Error ? err : undefined,
      });
    }
  }

  async delete(path: string): Promise<void> {
    await this.request({ method: 'DELETE', path });
  }
```

- [ ] **Step 4: Run all client tests**

```bash
npx vitest run cli/tests/gateway/client.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add cli/src/gateway/client.ts cli/tests/gateway/client.test.ts
git commit -m "feat(gateway): add postJson and delete methods"
```

---

## Task 7: `fromCommand` factory

**Files:**

- Modify: `cli/src/gateway/client.ts` (add static `fromCommand`)
- Modify: `cli/tests/gateway/client.test.ts` (add tests)

- [ ] **Step 1: Write the failing tests**

Add this `describe` block inside `describe('GatewayClient', ...)`:

```typescript
describe('fromCommand', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a client that uses the command for logging', async () => {
    const cmd = {
      get isVerbose() {
        return true;
      },
      log: vi.fn(),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

    const client = GatewayClient.fromCommand(
      cmd as unknown as Parameters<typeof GatewayClient.fromCommand>[0],
      { gateway: 'https://api.example.com', token: 'tok' }
    );
    await client.request({ method: 'GET', path: '/x' });

    expect(cmd.log).toHaveBeenCalledWith('Requesting GET https://api.example.com/x');
  });

  it('does not log when command isVerbose is false', async () => {
    const cmd = {
      get isVerbose() {
        return false;
      },
      log: vi.fn(),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

    const client = GatewayClient.fromCommand(
      cmd as unknown as Parameters<typeof GatewayClient.fromCommand>[0],
      { gateway: 'https://api.example.com', token: 'tok' }
    );
    await client.request({ method: 'GET', path: '/x' });

    expect(cmd.log).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run new tests to verify they fail**

```bash
npx vitest run cli/tests/gateway/client.test.ts -t "fromCommand"
```

Expected: FAIL — `fromCommand` does not exist.

- [ ] **Step 3: Implement `fromCommand`**

In `cli/src/gateway/client.ts`, add this static method at the top of the `GatewayClient` class (just
below the field declarations and before the constructor):

```typescript
  static fromCommand(
    cmd: { readonly isVerbose: boolean; log(message: string): void },
    opts: { gateway: string; token: string }
  ): GatewayClient {
    return new GatewayClient({
      gateway: opts.gateway,
      token: opts.token,
      logger: {
        get isVerbose() {
          return cmd.isVerbose;
        },
        log: (msg) => cmd.log(msg),
      },
    });
  }
```

The getter wrapping ensures we read `cmd.isVerbose` at log time, not construction time — important
because oclif sets the flag during `init()`, which may run after the client is created.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run cli/tests/gateway/client.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add cli/src/gateway/client.ts cli/tests/gateway/client.test.ts
git commit -m "feat(gateway): add fromCommand factory"
```

---

## Task 8: Migrate `auth/login.ts` to GatewayClient

**Files:**

- Modify: `cli/src/commands/everywhere/auth/login.ts`
- Modify: `cli/tests/commands/everywhere/auth/login.test.ts`

This task replaces the local fetch + `describeFetchError` + verbose logs + parse error handling with
the client. Behavior changes that callers see:

- Verbose log lines change from `Verifying token at <url>` / `Token verification response: ...` /
  `Token verification request failed: ...` to `Requesting GET <url>` / `Response: ...` /
  `Request failed: ...` (now client-owned).
- Error message format changes from `Token validation request failed: ...` /
  `Token validation failed (HTTP 401).` / `Token validation response was not valid JSON.` to the
  client's `GET <url> failed: ...` form.
- The identity-fields check (missing sub/tenant) and the `Authenticated as ...` verbose log stay in
  the command (those are domain/command concerns).

- [ ] **Step 1: Rewrite the login test file**

Open `cli/tests/commands/everywhere/auth/login.test.ts` and replace its `describe('run', ...)` body.
The full new file should look like this:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '@oclif/core/config';
import type { AppConfig, ConfigProvider } from '../../../../src/config.js';
import LoginCommand from '../../../../src/commands/everywhere/auth/login.js';
import EverywhereBaseCommand from '../../../../src/lib/command.js';
import { GatewayRequestError } from '../../../../src/gateway/client.js';

vi.mock('../../../../src/config.js', () => ({
  appConfig: vi.fn(),
  setPluginDir: vi.fn(),
}));

vi.mock('../../../../src/gateway/client.js', async () => {
  const actual = await vi.importActual<typeof import('../../../../src/gateway/client.js')>(
    '../../../../src/gateway/client.js'
  );
  return {
    ...actual,
    GatewayClient: {
      fromCommand: vi.fn(),
    },
  };
});

import { appConfig } from '../../../../src/config.js';
import { GatewayClient } from '../../../../src/gateway/client.js';

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fake-signature`;
}

describe('everywhere auth login', () => {
  it('exists as a command class', () => {
    expect(LoginCommand).toBeDefined();
  });

  describe('description', () => {
    it('describes token-based authentication', () => {
      expect(LoginCommand.description).toBe(
        'Authenticate with a Workday server using an access token.'
      );
    });
  });

  describe('flags', () => {
    it('has a gateway flag', () => {
      expect(LoginCommand.flags['gateway']).toBeDefined();
    });

    it('has a token flag', () => {
      expect(LoginCommand.flags['token']).toBeDefined();
    });

    it('inherits the plugin-dir flag from the base command', () => {
      expect(LoginCommand.flags['plugin-dir']).toBe(EverywhereBaseCommand.baseFlags['plugin-dir']);
    });
  });

  describe('run', () => {
    let cmd: LoginCommand;
    let writeSpy: ReturnType<typeof vi.fn>;
    let getJsonSpy: ReturnType<typeof vi.fn>;

    const baseConfig: AppConfig = {
      auth: { gateway: 'https://gateway.example.com' },
    };

    const makeConfigProvider = (data: AppConfig) =>
      ({
        read: () => data,
        write: writeSpy,
        path: '',
      }) as ConfigProvider<AppConfig>;

    beforeEach(() => {
      writeSpy = vi.fn();
      getJsonSpy = vi.fn().mockResolvedValue({ sub: 'user-123', tenant: 'tenant-abc' });
      cmd = new LoginCommand([], {} as Config);
      vi.spyOn(cmd, 'parse').mockResolvedValue({
        flags: {
          token: makeJwt({ sub: 'user-123', exp: 9999999999 }),
        },
      } as unknown as Awaited<ReturnType<LoginCommand['parse']>>);
      vi.mocked(appConfig).mockReturnValue(makeConfigProvider(baseConfig));
      vi.mocked(GatewayClient.fromCommand).mockReturnValue({
        getJson: getJsonSpy,
      } as unknown as ReturnType<typeof GatewayClient.fromCommand>);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('builds the client with the gateway and token', async () => {
      const token = makeJwt({ sub: 'user-123', exp: 9999999999 });
      vi.spyOn(cmd, 'parse').mockResolvedValue({
        flags: { token },
      } as unknown as Awaited<ReturnType<LoginCommand['parse']>>);

      await cmd.run();

      expect(GatewayClient.fromCommand).toHaveBeenCalledWith(cmd, {
        gateway: 'https://gateway.example.com',
        token,
      });
    });

    it('calls /api/v1/me on the client', async () => {
      await cmd.run();

      expect(getJsonSpy).toHaveBeenCalledWith('/api/v1/me');
    });

    it('writes config after successful token validation', async () => {
      await cmd.run();

      expect(writeSpy).toHaveBeenCalledWith({
        auth: {
          gateway: 'https://gateway.example.com',
          token: makeJwt({ sub: 'user-123', exp: 9999999999 }),
        },
      });
    });

    it('does not write config when the client throws', async () => {
      getJsonSpy.mockRejectedValue(
        new GatewayRequestError('GET https://gateway.example.com/api/v1/me failed: HTTP 401', {
          method: 'GET',
          url: 'https://gateway.example.com/api/v1/me',
          status: 401,
        })
      );

      await cmd.run().catch(() => {});

      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('surfaces the client error message', async () => {
      getJsonSpy.mockRejectedValue(
        new GatewayRequestError('GET https://gateway.example.com/api/v1/me failed: HTTP 401', {
          method: 'GET',
          url: 'https://gateway.example.com/api/v1/me',
          status: 401,
        })
      );

      await expect(cmd.run()).rejects.toThrow(
        'GET https://gateway.example.com/api/v1/me failed: HTTP 401'
      );
    });

    describe('identity validation', () => {
      it('errors when the response is missing sub', async () => {
        getJsonSpy.mockResolvedValue({ tenant: 'tenant-abc' });

        await expect(cmd.run()).rejects.toThrow(
          'Token validation response missing identity fields.'
        );
      });

      it('errors when the response is missing tenant', async () => {
        getJsonSpy.mockResolvedValue({ sub: 'user-123' });

        await expect(cmd.run()).rejects.toThrow(
          'Token validation response missing identity fields.'
        );
      });
    });

    describe('verbose output', () => {
      let logSpy: ReturnType<typeof vi.spyOn>;

      beforeEach(() => {
        Object.defineProperty(cmd, 'isVerbose', { get: () => true, configurable: true });
        logSpy = vi.spyOn(cmd, 'log').mockImplementation(() => {});
      });

      it('logs the identity on successful verification', async () => {
        await cmd.run();

        expect(logSpy).toHaveBeenCalledWith('Authenticated as user-123 on tenant tenant-abc');
      });
    });

    describe('non-verbose output', () => {
      it('does not emit identity log when verbose is off', async () => {
        const logSpy = vi.spyOn(cmd, 'log').mockImplementation(() => {});

        await cmd.run();

        const identityCalls = logSpy.mock.calls.filter(
          ([msg]) => typeof msg === 'string' && msg.startsWith('Authenticated as ')
        );
        expect(identityCalls).toHaveLength(0);
      });
    });
  });
});
```

Tests removed by this rewrite (their behavior is now covered by client tests):

- `'calls /api/v1/me to validate the token'` (URL construction → client test)
- `'sends the token as a bearer authorization header'` (bearer auth → client test)
- `'reports an auth failure when validation endpoint returns non-ok'` (replaced by
  `'surfaces the client error message'`)
- `'errors when the response body is not valid JSON'` (JSON parse → client test)
- `'logs the verification URL before contacting the server'` (transport log → client test)
- `'logs the response status on success'` (transport log → client test)
- `'logs the response status before failing on non-2xx'` (transport log → client test)
- `'logs the network error message when fetch throws'` (transport log → client test)
- `'unwraps the underlying cause when fetch throws with a cause'` (transport log → client test)
- `'falls back to the cause message when no code is present'` (transport log → client test)

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run cli/tests/commands/everywhere/auth/login.test.ts
```

Expected: FAIL — the new tests expect `GatewayClient.fromCommand` to be called, but the command
still uses raw `fetch`.

- [ ] **Step 3: Rewrite `login.ts` to use the client**

Replace the entire contents of `cli/src/commands/everywhere/auth/login.ts` with:

```typescript
import * as readline from 'node:readline';
import { Flags } from '@oclif/core';
import chalk from 'chalk';
import EverywhereBaseCommand from '../../../lib/command.js';
import { appConfig } from '../../../config.js';
import { DEFAULT_GATEWAY } from '../../../auth/defaults.js';
import { parseGatewayUrl } from '../../../auth/gateway.js';
import { decodeToken } from '../../../auth/token.js';
import { GatewayClient, GatewayRequestError } from '../../../gateway/client.js';

export default class AuthLoginCommand extends EverywhereBaseCommand {
  static description = 'Authenticate with a Workday server using an access token.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
    gateway: Flags.string({
      description: 'Workday API gateway URL (e.g. https://api.workday.com).',
    }),
    token: Flags.string({
      description: 'Access token (omit to enter interactively).',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(AuthLoginCommand);
    const config = appConfig();
    const saved = config.read();

    let gateway: string;
    try {
      gateway = parseGatewayUrl(flags.gateway ?? saved.auth?.gateway ?? DEFAULT_GATEWAY);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.error(message);
    }

    const token = flags.token ?? (await this.promptForToken());

    if (!token) {
      this.error('No token provided.');
    }

    try {
      decodeToken(token);
    } catch {
      this.error('Invalid token format. Please provide a valid JWT.');
    }

    const client = GatewayClient.fromCommand(this, { gateway, token });

    let body: unknown;
    try {
      body = await client.getJson('/api/v1/me');
    } catch (err) {
      if (err instanceof GatewayRequestError) this.error(err.message);
      throw err;
    }

    if (
      !body ||
      typeof body !== 'object' ||
      typeof (body as Record<string, unknown>).sub !== 'string' ||
      typeof (body as Record<string, unknown>).tenant !== 'string'
    ) {
      this.error('Token validation response missing identity fields.');
    }
    const identity = body as { sub: string; tenant: string };
    if (this.isVerbose) {
      this.log(`Authenticated as ${identity.sub} on tenant ${identity.tenant}`);
    }

    config.write({ auth: { gateway, token } });
    this.log(chalk.green('Successfully authenticated.'));
  }

  private async promptForToken(): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr,
    });

    return new Promise<string>((resolve) => {
      rl.question('Paste your access token: ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run cli/tests/commands/everywhere/auth/login.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/everywhere/auth/login.ts cli/tests/commands/everywhere/auth/login.test.ts
git commit -m "refactor(auth): migrate login command to GatewayClient"
```

---

## Task 9: Migrate `auth/token.ts` to GatewayClient

**Files:**

- Modify: `cli/src/commands/everywhere/auth/token.ts`
- Modify: `cli/tests/commands/everywhere/auth/token.test.ts`

- [ ] **Step 1: Read the existing test file to understand structure**

```bash
cat cli/tests/commands/everywhere/auth/token.test.ts
```

Take note of the existing mock setup and test cases. The new tests will follow the same pattern as
the login migration: mock `GatewayClient.fromCommand` to return an object with a `getText` spy.

- [ ] **Step 2: Write the failing tests**

Replace the body of `describe('run', ...)` in `cli/tests/commands/everywhere/auth/token.test.ts`
with tests that mock `GatewayClient.fromCommand` (matching the pattern from Task 8). The exact
rewrite varies by what's currently there — preserve test names that still apply (e.g.,
`'errors when there is no token'`), and replace fetch-based assertions with client-based ones:

- `'requests the token endpoint via the client'` → asserts `getText` was called with
  `'/api/v1/auth/token'`
- `'prints the parsed token by default'` → mocks `getText` to return `'{"token":"abc"}'`, asserts
  `cmd.log` called with `'abc'`
- `'prints the raw body when --json is set'` → mocks `getText` to return
  `'{"token":"abc","more":1}'`, asserts log called with that whole string
- `'errors when the response body is not valid JSON'` → mocks `getText` to return `'not-json'`,
  asserts error message `'Gateway response was not valid JSON.'`
- `'errors when the response is missing a token field'` → mocks `getText` to return `'{}'`, asserts
  error message `'Gateway response did not contain a `token` field.'`

Add the same `vi.mock('../../../../src/gateway/client.js', ...)` pattern as Task 8.

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run cli/tests/commands/everywhere/auth/token.test.ts
```

Expected: FAIL — command still uses raw fetch.

- [ ] **Step 4: Rewrite `token.ts` to use the client**

Replace the entire contents of `cli/src/commands/everywhere/auth/token.ts` with:

```typescript
import chalk from 'chalk';
import { Flags } from '@oclif/core';
import EverywhereBaseCommand from '../../../lib/command.js';
import { appConfig } from '../../../config.js';
import { DEFAULT_GATEWAY } from '../../../auth/defaults.js';
import { GatewayClient, GatewayRequestError } from '../../../gateway/client.js';

export default class AuthTokenCommand extends EverywhereBaseCommand {
  static description = 'Fetch and display an access token from the gateway.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
    json: Flags.boolean({
      description: 'Output the full JSON response body instead of just the token.',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parseFlags();
    const config = appConfig();
    const saved = config.read();
    const token = saved.auth?.token;

    if (!token) {
      this.error(chalk.red('Not authenticated. Run `everywhere auth login` first.'));
    }

    const gateway = saved.auth?.gateway ?? DEFAULT_GATEWAY;
    const client = GatewayClient.fromCommand(this, { gateway, token });

    let body: string;
    try {
      body = await client.getText('/api/v1/auth/token');
    } catch (err) {
      if (err instanceof GatewayRequestError) this.error(err.message);
      throw err;
    }

    if (flags.json) {
      this.log(body);
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      this.error('Gateway response was not valid JSON.');
    }
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as { token?: unknown }).token !== 'string'
    ) {
      this.error('Gateway response did not contain a `token` field.');
    }
    this.log((parsed as { token: string }).token);
  }

  protected async parseFlags(): Promise<{ flags: { json: boolean } }> {
    const { flags } = await this.parse(AuthTokenCommand);
    return { flags: { json: flags.json } };
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run cli/tests/commands/everywhere/auth/token.test.ts
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add cli/src/commands/everywhere/auth/token.ts cli/tests/commands/everywhere/auth/token.test.ts
git commit -m "refactor(auth): migrate token command to GatewayClient"
```

---

## Task 10: Migrate `registry.ts` to GatewayClient

**Files:**

- Modify: `cli/src/registry/registry.ts`
- Modify: `cli/tests/registry/registry.test.ts`
- Modify: `cli/tests/registry/registry-delete.test.ts`

`registry.ts` exposes two pure functions (`uploadToRegistry`, `deleteFromRegistry`) that take
`{ gateway, token }`. They have no command context. They construct the client directly:
`new GatewayClient({ gateway, token })` (no logger — they're library functions, not commands).

- [ ] **Step 1: Read the existing test files**

```bash
cat cli/tests/registry/registry.test.ts
cat cli/tests/registry/registry-delete.test.ts
```

Note the existing mocking strategy (fetch stub) and the test cases.

- [ ] **Step 2: Rewrite `registry.ts` to use the client**

Replace the entire contents of `cli/src/registry/registry.ts` with:

```typescript
import * as fs from 'node:fs';
import { GatewayClient, GatewayRequestError } from '../gateway/client.js';

export interface RegistryUploadOptions {
  gateway: string;
  token: string;
  archivePath: string;
}

export interface RegistryUploadResult {
  tenant: string;
  name: string;
  title: string;
  bundleUrl: string;
}

const REGISTRY_UPLOAD_RESULT_KEYS: (keyof RegistryUploadResult)[] = [
  'tenant',
  'name',
  'title',
  'bundleUrl',
];

function parseRegistryUploadResult(json: unknown): RegistryUploadResult {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    throw TypeError(
      `Expected JSON response to parse to an object, but was ${Object.prototype.toString.call(json)}`
    );
  }

  const record = json as Record<string, unknown>;
  const result = {} as RegistryUploadResult;

  for (const key of REGISTRY_UPLOAD_RESULT_KEYS) {
    const value = record[key];

    if (typeof value !== 'string') {
      throw TypeError(
        `Expected ${key} to be a string, but was ${Object.prototype.toString.call(value)}`
      );
    }

    result[key] = value;
  }
  return result;
}

export interface RegistryDeleteOptions {
  gateway: string;
  token: string;
  appId: string;
}

export async function deleteFromRegistry(options: RegistryDeleteOptions): Promise<void> {
  const { gateway, token, appId } = options;
  const client = new GatewayClient({ gateway, token });

  try {
    await client.delete(`/api/v1/app/${appId}`);
  } catch (err) {
    if (err instanceof GatewayRequestError) {
      throw new Error(`Failed to unpublish plugin: ${err.message}`, { cause: err });
    }
    throw err;
  }
}

export async function uploadToRegistry(
  options: RegistryUploadOptions
): Promise<RegistryUploadResult> {
  const { gateway, token, archivePath } = options;
  const client = new GatewayClient({ gateway, token });

  const blob = await fs.openAsBlob(archivePath, { type: 'application/zip' });

  let response: Response;
  try {
    response = await client.request({
      method: 'POST',
      path: '/api/v1/apps/publish',
      body: blob,
      headers: { 'Content-Type': 'application/zip' },
    });
  } catch (err) {
    if (err instanceof GatewayRequestError) {
      throw new Error(`Failed to upload plugin: ${err.message}`, { cause: err });
    }
    throw err;
  }

  const body: unknown = await response.json();
  return parseRegistryUploadResult(body);
}
```

- [ ] **Step 3: Update both test files to mock the client**

For each of `registry.test.ts` and `registry-delete.test.ts`, replace the `fetch` mocks with a mock
of `GatewayClient`:

```typescript
vi.mock('../../src/gateway/client.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/gateway/client.js')>(
    '../../src/gateway/client.js'
  );
  return {
    ...actual,
    GatewayClient: vi.fn().mockImplementation(() => ({
      delete: vi.fn(),
      request: vi.fn(),
    })),
  };
});
```

Test cases (preserve names where they still describe the behavior):

For `registry-delete.test.ts`:

- `'issues a DELETE for the app id'` — assert `client.delete` was called with `'/api/v1/app/<id>'`
- `'wraps GatewayRequestError with a friendly message'` — make the mocked `delete` reject with a
  `GatewayRequestError`, assert the thrown error matches `/Failed to unpublish plugin: .../`
- `'rethrows non-Gateway errors as-is'` — make delete reject with a plain Error, assert it
  propagates unchanged

For `registry.test.ts`:

- `'POSTs the blob to /api/v1/apps/publish'` — assert `client.request` was called with the correct
  method/path/headers
- `'parses the JSON response into RegistryUploadResult'` — make `request` return a `Response` with
  valid JSON, assert returned object matches
- `'throws when the JSON response is missing fields'` — make `request` return a `Response` with
  `{ tenant: 'x' }`, assert thrown error matches `/Expected .* to be a string/`
- `'wraps GatewayRequestError with a friendly message'` — make `request` reject with
  `GatewayRequestError`, assert thrown error matches `/Failed to upload plugin: .../`
- `'rethrows non-Gateway errors as-is'` — make request reject with a plain Error, assert it
  propagates

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run cli/tests/registry/
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add cli/src/registry/registry.ts cli/tests/registry/
git commit -m "refactor(registry): migrate publish and unpublish to GatewayClient"
```

---

## Task 11: Migrate `codegen/introspect.ts` to GatewayClient

**Files:**

- Modify: `cli/src/codegen/introspect.ts`
- Modify: `cli/tests/codegen/introspect.test.ts`

`introspect()` is a pure function returning a Result `{ ok, reason }`. It uses the client via
constructor (no command/logger), catches `GatewayRequestError`, and maps it back to the Result
shape.

- [ ] **Step 1: Read the existing test file**

```bash
cat cli/tests/codegen/introspect.test.ts
```

Note which tests cover the fetch behavior (network errors, non-200 responses, GraphQL errors). The
GraphQL error tests stay as-is (they're about `body.errors`, not transport).

- [ ] **Step 2: Modify the introspect() function in `cli/src/codegen/introspect.ts`**

Find the fetch block (around lines 173–199) and replace it with the client. Locate this code:

```typescript
let response: Response;
try {
  response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
  });
} catch (e) {
  return {
    ok: false,
    reason: {
      kind: 'network-error',
      message: e instanceof Error ? e.message : String(e),
    },
  };
}

if (!response.ok) {
  return {
    ok: false,
    reason: { kind: 'api-error', message: `HTTP ${response.status}: ${response.statusText}` },
  };
}
```

Replace with:

```typescript
const client = new GatewayClient({ gateway, token });
let response: Response;
try {
  response = await client.request({
    method: 'POST',
    path: '/api/v1/data/graphql',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
} catch (e) {
  if (e instanceof GatewayRequestError) {
    const kind = e.status !== undefined ? 'api-error' : 'network-error';
    return { ok: false, reason: { kind, message: e.message } };
  }
  return {
    ok: false,
    reason: {
      kind: 'network-error',
      message: e instanceof Error ? e.message : String(e),
    },
  };
}
```

The `endpoint` variable declared earlier
(`const endpoint = new URL('/api/v1/data/graphql', gateway).toString();`) is now unused — delete
that line.

Add at the top of the file (with the other imports):

```typescript
import { GatewayClient, GatewayRequestError } from '../gateway/client.js';
```

- [ ] **Step 3: Update tests in `cli/tests/codegen/introspect.test.ts`**

Replace the `fetch` mocks with a mock of `GatewayClient`. The test names should still describe
behavior accurately. Specifically:

- Tests asserting on URL/method/headers go away (those are client tests now).
- Tests asserting network-error reasons stay — mock `client.request` to throw a
  `GatewayRequestError` without `status` and assert the result is
  `{ ok: false, reason: { kind: 'network-error', message: ... } }`.
- Tests asserting api-error reasons stay — mock `client.request` to throw a `GatewayRequestError`
  with `status: 500` and assert the result is
  `{ ok: false, reason: { kind: 'api-error', message: ... } }`.
- Tests asserting GraphQL errors stay — they go through the success path of `client.request` and
  check the response body.

Add the same `vi.mock('../../src/gateway/client.js', ...)` pattern as Task 10.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run cli/tests/codegen/introspect.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add cli/src/codegen/introspect.ts cli/tests/codegen/introspect.test.ts
git commit -m "refactor(codegen): migrate introspect to GatewayClient"
```

---

## Task 12: Final verification

- [ ] **Step 1: Run the full check suite**

```bash
just check
```

Expected: PASS (typecheck + lint clean).

- [ ] **Step 2: Run all tests**

```bash
just test
```

Expected: All tests PASS.

- [ ] **Step 3: Search for any remaining direct fetch calls in cli/src**

```bash
grep -rn "fetch(" cli/src/ --include="*.ts" | grep -v "gateway/client.ts"
```

Expected: No matches. (If there are matches, they need to migrate too — flag any to the user.)

- [ ] **Step 4: Confirm clean tree**

```bash
git status
```

Expected: working tree clean.
