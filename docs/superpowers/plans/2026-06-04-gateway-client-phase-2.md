# GatewayClient Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close Phase 1 gaps — add client-side diagnostics (env dump, timing, body preview,
X-Request-Id, bearer indicator), thread verbose logger through registry/introspect callers, and
clean up two Phase 1 architectural rough edges (visibility wart, duplicated error-surfacing).

**Architecture:** Extend `GatewayClient.request()` with diagnostic log lines. Add
`protected createGatewayLogger()` and `protected surfaceGatewayError()` helpers on
`EverywhereBaseCommand`. Change `GatewayClient.fromCommand` to accept a `VerboseLogger` directly (no
command type). Add optional `logger?: VerboseLogger` to `uploadToRegistry`, `deleteFromRegistry`,
`introspectGraphTypes`; thread it from callers.

**Tech Stack:** TypeScript, vitest, oclif, Node `fetch`

**Spec:** `docs/superpowers/specs/2026-06-04-gateway-client-phase-2-design.md`

**Working directory:** `.worktrees/chatty-chameleon` (branch `feat/auth-verbose-logging`)

All file paths below are relative to the worktree root.

---

## Task 1: Visibility refactor — `createGatewayLogger` and `fromCommand(logger, …)`

**Files:**

- Modify: `cli/src/lib/command.ts` (add `createGatewayLogger`, revert `isVerbose` to protected)
- Modify: `cli/src/gateway/client.ts` (change `fromCommand` signature to accept `VerboseLogger`)
- Modify: `cli/tests/gateway/client.test.ts` (update fromCommand tests)
- Modify: `cli/src/commands/everywhere/auth/login.ts` (call site update)
- Modify: `cli/src/commands/everywhere/auth/token.ts` (call site update)
- Modify: `cli/tests/commands/everywhere/auth/login.test.ts` (update assertion on fromCommand args)
- Modify: `cli/tests/commands/everywhere/auth/token.test.ts` (update assertion on fromCommand args)

This task changes the contract of `GatewayClient.fromCommand` and adds the helper that callers use
to get a logger. It touches several files but each change is small and mechanical.

- [ ] **Step 1: Update `GatewayClient.fromCommand` signature in `cli/src/gateway/client.ts`**

Find the existing `fromCommand`:

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

Replace with:

```typescript
  static fromCommand(
    logger: VerboseLogger,
    opts: { gateway: string; token: string }
  ): GatewayClient {
    return new GatewayClient({
      gateway: opts.gateway,
      token: opts.token,
      logger,
    });
  }
```

- [ ] **Step 2: Update the `fromCommand` tests in `cli/tests/gateway/client.test.ts`**

Find the existing `describe('fromCommand', ...)` block and replace its two `it` blocks with these
(the test variable names change from `cmd` to `logger` and the assertions check that the passed-in
logger is used directly):

```typescript
it('uses the provided logger when isVerbose is true', async () => {
  const logger = {
    get isVerbose() {
      return true;
    },
    log: vi.fn(),
  };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

  const client = GatewayClient.fromCommand(logger, {
    gateway: 'https://api.example.com',
    token: 'tok',
  });
  await client.request({ method: 'GET', path: '/x' });

  expect(logger.log).toHaveBeenCalledWith('Requesting GET https://api.example.com/x');
});

it('does not log when logger isVerbose is false', async () => {
  const logger = {
    get isVerbose() {
      return false;
    },
    log: vi.fn(),
  };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

  const client = GatewayClient.fromCommand(logger, {
    gateway: 'https://api.example.com',
    token: 'tok',
  });
  await client.request({ method: 'GET', path: '/x' });

  expect(logger.log).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Add `createGatewayLogger` and revert `isVerbose` visibility in
      `cli/src/lib/command.ts`**

Add an import at the top of `cli/src/lib/command.ts`:

```typescript
import type { VerboseLogger } from '../gateway/client.js';
```

Find the existing public getter:

```typescript
  public get isVerbose(): boolean {
    return this._verbose;
  }
```

Change `public` back to `protected`:

```typescript
  protected get isVerbose(): boolean {
    return this._verbose;
  }
```

Then add this protected method immediately after the `isVerbose` getter (before the `pluginDir`
getter):

```typescript
  protected createGatewayLogger(): VerboseLogger {
    const cmd = this;
    return {
      get isVerbose() {
        return cmd._verbose;
      },
      log: (msg: string) => cmd.log(msg),
    };
  }
```

Note: we capture `cmd = this` because the returned object literal's getter has its own `this`. We
read `cmd._verbose` directly (a private field in the same class — accessible via the captured
reference).

- [ ] **Step 4: Update `cli/src/commands/everywhere/auth/login.ts`**

Find:

```typescript
const client = GatewayClient.fromCommand(this, { gateway, token });
```

Replace with:

```typescript
const client = GatewayClient.fromCommand(this.createGatewayLogger(), { gateway, token });
```

- [ ] **Step 5: Update `cli/src/commands/everywhere/auth/token.ts`**

Find:

```typescript
const client = GatewayClient.fromCommand(this, { gateway, token });
```

Replace with:

```typescript
const client = GatewayClient.fromCommand(this.createGatewayLogger(), { gateway, token });
```

- [ ] **Step 6: Update login test's fromCommand assertion**

In `cli/tests/commands/everywhere/auth/login.test.ts`, find the test that asserts on the
`fromCommand` arguments:

```typescript
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
```

Change the assertion's first argument from `cmd` to any object with the `isVerbose`/`log` shape —
the logger is constructed inside `createGatewayLogger` so we can't compare by reference. Use
`expect.objectContaining`:

```typescript
it('builds the client with a logger and the gateway and token', async () => {
  const token = makeJwt({ sub: 'user-123', exp: 9999999999 });
  vi.spyOn(cmd, 'parse').mockResolvedValue({
    flags: { token },
  } as unknown as Awaited<ReturnType<LoginCommand['parse']>>);

  await cmd.run();

  expect(GatewayClient.fromCommand).toHaveBeenCalledWith(
    expect.objectContaining({ isVerbose: expect.any(Boolean), log: expect.any(Function) }),
    { gateway: 'https://gateway.example.com', token }
  );
});
```

- [ ] **Step 7: Update token test's fromCommand assertion**

In `cli/tests/commands/everywhere/auth/token.test.ts`, find:

```typescript
it('builds the client with the saved gateway and token', async () => {
  await cmd.run();

  expect(GatewayClient.fromCommand).toHaveBeenCalledWith(cmd, {
    gateway: 'https://gateway.example.com',
    token: 'test-token',
  });
});
```

Replace with:

```typescript
it('builds the client with a logger and the saved gateway and token', async () => {
  await cmd.run();

  expect(GatewayClient.fromCommand).toHaveBeenCalledWith(
    expect.objectContaining({ isVerbose: expect.any(Boolean), log: expect.any(Function) }),
    { gateway: 'https://gateway.example.com', token: 'test-token' }
  );
});
```

- [ ] **Step 8: Run the full test suite**

```bash
just check
just test
```

Expected: All tests PASS, typecheck and lint clean.

- [ ] **Step 9: Commit**

```bash
git add cli/src/gateway/client.ts cli/src/lib/command.ts cli/src/commands/everywhere/auth/login.ts cli/src/commands/everywhere/auth/token.ts cli/tests/gateway/client.test.ts cli/tests/commands/everywhere/auth/login.test.ts cli/tests/commands/everywhere/auth/token.test.ts
git commit -m "refactor(gateway): make fromCommand accept VerboseLogger and revert isVerbose visibility"
```

---

## Task 2: Error-surface helper on EverywhereBaseCommand

**Files:**

- Modify: `cli/src/lib/command.ts` (add `surfaceGatewayError`)
- Modify: `cli/src/commands/everywhere/auth/login.ts` (use helper)
- Modify: `cli/src/commands/everywhere/auth/token.ts` (use helper)

No new tests required — `login` and `token` tests already cover the behavior (a
`GatewayRequestError` rejected from the client produces the same error message from the command).

- [ ] **Step 1: Add `surfaceGatewayError` to `cli/src/lib/command.ts`**

Add an import at the top:

```typescript
import { GatewayRequestError } from '../gateway/client.js';
```

(Combine with the existing `import type { VerboseLogger } from '../gateway/client.js';` from Task 1
if you prefer — a single combined import is fine:
`import { GatewayRequestError, type VerboseLogger } from '../gateway/client.js';`.)

Add this protected method to `EverywhereBaseCommand` after `createGatewayLogger`:

```typescript
  protected surfaceGatewayError(err: unknown): never {
    if (err instanceof GatewayRequestError) this.error(err.message);
    throw err;
  }
```

- [ ] **Step 2: Update `cli/src/commands/everywhere/auth/login.ts`**

Find:

```typescript
let body: unknown;
try {
  body = await client.getJson('/api/v1/me');
} catch (err) {
  if (err instanceof GatewayRequestError) this.error(err.message);
  throw err;
}
```

Replace with:

```typescript
let body: unknown;
try {
  body = await client.getJson('/api/v1/me');
} catch (err) {
  this.surfaceGatewayError(err);
}
```

The import of `GatewayRequestError` from `client.js` is now unused — change it to import only
`GatewayClient`:

```typescript
import { GatewayClient } from '../../../gateway/client.js';
```

- [ ] **Step 3: Update `cli/src/commands/everywhere/auth/token.ts`**

Find:

```typescript
let body: string;
try {
  body = await client.getText('/api/v1/auth/token');
} catch (err) {
  if (err instanceof GatewayRequestError) this.error(err.message);
  throw err;
}
```

Replace with:

```typescript
let body: string;
try {
  body = await client.getText('/api/v1/auth/token');
} catch (err) {
  this.surfaceGatewayError(err);
}
```

The import of `GatewayRequestError` is now unused — change to:

```typescript
import { GatewayClient } from '../../../gateway/client.js';
```

- [ ] **Step 4: Run the full test suite**

```bash
just check
just test
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add cli/src/lib/command.ts cli/src/commands/everywhere/auth/login.ts cli/src/commands/everywhere/auth/token.ts
git commit -m "refactor(cli): add surfaceGatewayError helper and use in auth commands"
```

---

## Task 3: Environment dump on first request

**Files:**

- Modify: `cli/src/gateway/client.ts` (add env dump + module flag + reset helper)
- Modify: `cli/tests/gateway/client.test.ts` (add tests)

- [ ] **Step 1: Write the failing tests**

Add a new `describe` block inside `describe('GatewayClient', ...)`:

```typescript
describe('environment dump', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    // Reset the once-per-process flag so each test sees a fresh first request.
    resetEnvLoggedForTesting();
  });

  function makeLogger() {
    return { isVerbose: true, log: vi.fn() };
  }

  it('logs the environment block before the first request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    const logger = makeLogger();
    const client = new GatewayClient({
      gateway: 'https://api.example.com',
      token: 'tok',
      logger,
    });

    await client.request({ method: 'GET', path: '/x' });

    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Environment:'));
  });

  it('does not log the environment block on subsequent requests', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    const logger = makeLogger();
    const client = new GatewayClient({
      gateway: 'https://api.example.com',
      token: 'tok',
      logger,
    });

    await client.request({ method: 'GET', path: '/x' });
    logger.log.mockClear();
    await client.request({ method: 'GET', path: '/y' });

    const envCalls = logger.log.mock.calls.filter(
      ([msg]) => typeof msg === 'string' && msg.includes('Environment:')
    );
    expect(envCalls).toHaveLength(0);
  });

  it('shows (not set) for unset env vars', async () => {
    vi.stubEnv('HTTPS_PROXY', '');
    vi.stubEnv('HTTP_PROXY', '');
    vi.stubEnv('NO_PROXY', '');
    vi.stubEnv('NODE_EXTRA_CA_CERTS', '');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    const logger = makeLogger();
    const client = new GatewayClient({
      gateway: 'https://api.example.com',
      token: 'tok',
      logger,
    });

    await client.request({ method: 'GET', path: '/x' });

    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('HTTPS_PROXY: (not set)'));
  });

  it('shows the value when HTTPS_PROXY is set', async () => {
    vi.stubEnv('HTTPS_PROXY', 'http://proxy.example.com:8080');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    const logger = makeLogger();
    const client = new GatewayClient({
      gateway: 'https://api.example.com',
      token: 'tok',
      logger,
    });

    await client.request({ method: 'GET', path: '/x' });

    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('HTTPS_PROXY: http://proxy.example.com:8080')
    );
  });

  it('does not log the environment when no logger is provided', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    const client = new GatewayClient({ gateway: 'https://api.example.com', token: 'tok' });

    await expect(client.request({ method: 'GET', path: '/x' })).resolves.toBeDefined();
    // No logger means no env dump (no log target). Nothing to assert other than that we didn't throw.
  });
});
```

Add an import for `resetEnvLoggedForTesting` at the top of the test file:

```typescript
import {
  GatewayClient,
  GatewayRequestError,
  resetEnvLoggedForTesting,
} from '../../src/gateway/client.js';
```

- [ ] **Step 2: Run new tests to verify they fail**

```bash
npx vitest run cli/tests/gateway/client.test.ts -t "environment dump"
```

Expected: FAIL — `resetEnvLoggedForTesting` doesn't exist; env dump doesn't happen.

- [ ] **Step 3: Implement env dump in `cli/src/gateway/client.ts`**

Add at module level (after the imports/interfaces, before `describeFetchError`):

```typescript
let envLogged = false;

export function resetEnvLoggedForTesting(): void {
  envLogged = false;
}

function logEnvironment(logger: VerboseLogger): void {
  const envVar = (name: string): string => {
    const value = process.env[name];
    return value && value.length > 0 ? value : '(not set)';
  };
  const tlsReject = process.env['NODE_TLS_REJECT_UNAUTHORIZED'];
  const tlsRejectDisplay = tlsReject === undefined ? '(default)' : tlsReject;

  logger.log(
    [
      'Environment:',
      `  Node: ${process.version}`,
      `  HTTPS_PROXY: ${envVar('HTTPS_PROXY')}`,
      `  HTTP_PROXY: ${envVar('HTTP_PROXY')}`,
      `  NO_PROXY: ${envVar('NO_PROXY')}`,
      `  NODE_EXTRA_CA_CERTS: ${envVar('NODE_EXTRA_CA_CERTS')}`,
      `  NODE_TLS_REJECT_UNAUTHORIZED: ${tlsRejectDisplay}`,
    ].join('\n')
  );
}
```

Then in the `request()` method, at the very top (before the URL is built) add:

```typescript
if (this.logger?.isVerbose && !envLogged) {
  envLogged = true;
  logEnvironment(this.logger);
}
```

- [ ] **Step 4: Run all client tests**

```bash
npx vitest run cli/tests/gateway/client.test.ts
```

Expected: All tests PASS. The env-dump tests pass; existing verbose-logging tests still pass (they
use `vi.unstubAllGlobals()` in beforeEach but don't reset envLogged — most tests don't assert on the
env line so unrelated env dumps don't affect them).

If unrelated tests fail because they assert on `log.mock.calls.length` or first-call indexing, add
`resetEnvLoggedForTesting()` to the `beforeEach` of the `verbose logging` describe block too.

- [ ] **Step 5: Commit**

```bash
git add cli/src/gateway/client.ts cli/tests/gateway/client.test.ts
git commit -m "feat(gateway): log environment block before first request in verbose mode"
```

---

## Task 4: Request timing

**Files:**

- Modify: `cli/src/gateway/client.ts` (capture and append timing)
- Modify: `cli/tests/gateway/client.test.ts` (add tests)

- [ ] **Step 1: Write the failing tests**

Add inside `describe('verbose logging', ...)`:

```typescript
it('appends elapsed ms to the response line', async () => {
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

  expect(logger.log).toHaveBeenCalledWith(expect.stringMatching(/^Response: 200 OK \(\d+ms\)$/));
});

it('appends elapsed ms to the failure line', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('socket hang up')));
  const logger = makeLogger();
  const client = new GatewayClient({
    gateway: 'https://api.example.com',
    token: 'tok',
    logger,
  });

  await client.request({ method: 'GET', path: '/x' }).catch(() => {});

  expect(logger.log).toHaveBeenCalledWith(
    expect.stringMatching(/^Request failed: socket hang up \(\d+ms\)$/)
  );
});
```

- [ ] **Step 2: Run new tests to verify they fail**

```bash
npx vitest run cli/tests/gateway/client.test.ts -t "elapsed ms"
```

Expected: FAIL — current log lines don't include timing.

- [ ] **Step 3: Add timing in `request()`**

In `cli/src/gateway/client.ts`, modify the `request()` method:

- Add `const start = Date.now();` immediately before the `try { response = await fetch(...) }`
  block.
- Change the failure log:
  ```typescript
  if (this.logger?.isVerbose) {
    this.logger.log(`Request failed: ${described.message}`);
  }
  ```
  to:
  ```typescript
  if (this.logger?.isVerbose) {
    this.logger.log(`Request failed: ${described.message} (${Date.now() - start}ms)`);
  }
  ```
- Change the response log:

  ```typescript
  if (this.logger?.isVerbose) {
    this.logger.log(`Response: ${response.status} ${response.statusText}`);
  }
  ```

  to:

  ```typescript
  if (this.logger?.isVerbose) {
    this.logger.log(
      `Response: ${response.status} ${response.statusText} (${Date.now() - start}ms)`
    );
  }
  ```

- [ ] **Step 4: Run all client tests**

```bash
npx vitest run cli/tests/gateway/client.test.ts
```

Expected: All tests PASS. Existing tests that asserted on exact strings like `'Response: 200 OK'`
will now FAIL because the format changed. Update those assertions to use
`expect.stringContaining('Response: 200 OK')` or the regex form. Specifically:

In `describe('verbose logging', ...)`:

- `'logs the response status after the request'` — change
  `expect(logger.log).toHaveBeenCalledWith('Response: 200 OK')` to
  `expect(logger.log).toHaveBeenCalledWith(expect.stringMatching(/^Response: 200 OK \(\d+ms\)$/))`
- `'logs the failure message when fetch throws'` — change
  `expect(logger.log).toHaveBeenCalledWith('Request failed: ETIMEDOUT: boom')` to
  `expect(logger.log).toHaveBeenCalledWith(expect.stringMatching(/^Request failed: ETIMEDOUT: boom \(\d+ms\)$/))`

- [ ] **Step 5: Commit**

```bash
git add cli/src/gateway/client.ts cli/tests/gateway/client.test.ts
git commit -m "feat(gateway): include elapsed time in verbose response and failure lines"
```

---

## Task 5: Response body preview on non-2xx

**Files:**

- Modify: `cli/src/gateway/client.ts` (read body before throwing)
- Modify: `cli/tests/gateway/client.test.ts` (add tests)

- [ ] **Step 1: Write the failing tests**

Add inside `describe('verbose logging', ...)`:

```typescript
it('logs the response body preview on non-2xx', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response('{"error":"invalid manifest"}', { status: 400, statusText: 'Bad Request' })
      )
  );
  const logger = makeLogger();
  const client = new GatewayClient({
    gateway: 'https://api.example.com',
    token: 'tok',
    logger,
  });

  await client.request({ method: 'GET', path: '/x' }).catch(() => {});

  expect(logger.log).toHaveBeenCalledWith('Response body: {"error":"invalid manifest"}');
});

it('does not log a response body line when the body is empty', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('', { status: 500, statusText: 'Server Error' }))
  );
  const logger = makeLogger();
  const client = new GatewayClient({
    gateway: 'https://api.example.com',
    token: 'tok',
    logger,
  });

  await client.request({ method: 'GET', path: '/x' }).catch(() => {});

  const bodyCalls = logger.log.mock.calls.filter(
    ([msg]) => typeof msg === 'string' && msg.startsWith('Response body:')
  );
  expect(bodyCalls).toHaveLength(0);
});

it('truncates response body longer than 500 characters', async () => {
  const longBody = 'x'.repeat(800);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(longBody, { status: 500 })));
  const logger = makeLogger();
  const client = new GatewayClient({
    gateway: 'https://api.example.com',
    token: 'tok',
    logger,
  });

  await client.request({ method: 'GET', path: '/x' }).catch(() => {});

  expect(logger.log).toHaveBeenCalledWith(`Response body: ${'x'.repeat(500)}… (truncated)`);
});
```

- [ ] **Step 2: Run new tests to verify they fail**

```bash
npx vitest run cli/tests/gateway/client.test.ts -t "response body"
```

Expected: FAIL — body is not read or logged.

- [ ] **Step 3: Read and log body in `request()`**

In `cli/src/gateway/client.ts`, modify the `!response.ok` block. Replace:

```typescript
if (!response.ok) {
  throw new GatewayRequestError(
    `${opts.method} ${url} failed: HTTP ${response.status} ${response.statusText}`,
    { method: opts.method, url, status: response.status }
  );
}
```

with:

```typescript
if (!response.ok) {
  if (this.logger?.isVerbose) {
    let body = '';
    try {
      body = await response.text();
    } catch {
      // unreadable body — skip
    }
    if (body.length > 0) {
      const preview = body.length > 500 ? `${body.slice(0, 500)}… (truncated)` : body;
      this.logger.log(`Response body: ${preview}`);
    }
  }
  throw new GatewayRequestError(
    `${opts.method} ${url} failed: HTTP ${response.status} ${response.statusText}`,
    { method: opts.method, url, status: response.status }
  );
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
git commit -m "feat(gateway): log response body preview on non-2xx in verbose mode"
```

---

## Task 6: X-Request-Id echo

**Files:**

- Modify: `cli/src/gateway/client.ts` (read header, log if present)
- Modify: `cli/tests/gateway/client.test.ts` (add tests)

- [ ] **Step 1: Write the failing tests**

Add inside `describe('verbose logging', ...)`:

```typescript
it('logs X-Request-Id when present in the response', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: { 'X-Request-Id': 'abc-123' },
      })
    )
  );
  const logger = makeLogger();
  const client = new GatewayClient({
    gateway: 'https://api.example.com',
    token: 'tok',
    logger,
  });

  await client.request({ method: 'GET', path: '/x' });

  expect(logger.log).toHaveBeenCalledWith('X-Request-Id: abc-123');
});

it('does not log X-Request-Id when absent', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
  const logger = makeLogger();
  const client = new GatewayClient({
    gateway: 'https://api.example.com',
    token: 'tok',
    logger,
  });

  await client.request({ method: 'GET', path: '/x' });

  const idCalls = logger.log.mock.calls.filter(
    ([msg]) => typeof msg === 'string' && msg.startsWith('X-Request-Id:')
  );
  expect(idCalls).toHaveLength(0);
});
```

- [ ] **Step 2: Run new tests to verify they fail**

```bash
npx vitest run cli/tests/gateway/client.test.ts -t "X-Request-Id"
```

Expected: FAIL — header is not logged.

- [ ] **Step 3: Log X-Request-Id in `request()`**

In `cli/src/gateway/client.ts`, modify the Response log block. Find:

```typescript
if (this.logger?.isVerbose) {
  this.logger.log(`Response: ${response.status} ${response.statusText} (${Date.now() - start}ms)`);
}
```

Replace with:

```typescript
if (this.logger?.isVerbose) {
  this.logger.log(`Response: ${response.status} ${response.statusText} (${Date.now() - start}ms)`);
  const requestId = response.headers.get('x-request-id');
  if (requestId) {
    this.logger.log(`X-Request-Id: ${requestId}`);
  }
}
```

(Note: `Headers.get` is already case-insensitive per the WHATWG fetch spec, so `'x-request-id'`
matches `X-Request-Id`.)

- [ ] **Step 4: Run all client tests**

```bash
npx vitest run cli/tests/gateway/client.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add cli/src/gateway/client.ts cli/tests/gateway/client.test.ts
git commit -m "feat(gateway): echo X-Request-Id response header in verbose mode"
```

---

## Task 7: Bearer header presence indicator

**Files:**

- Modify: `cli/src/gateway/client.ts` (append token length to request line)
- Modify: `cli/tests/gateway/client.test.ts` (add test, update existing format-sensitive tests)

- [ ] **Step 1: Write the failing test**

Add inside `describe('verbose logging', ...)`:

```typescript
it('appends the bearer token length to the request line', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
  const logger = makeLogger();
  const client = new GatewayClient({
    gateway: 'https://api.example.com',
    token: 'token-with-12chars',
    logger,
  });

  await client.request({ method: 'GET', path: '/x' });

  expect(logger.log).toHaveBeenCalledWith(
    'Requesting GET https://api.example.com/x (bearer: 18 chars)'
  );
});
```

- [ ] **Step 2: Run new test to verify it fails**

```bash
npx vitest run cli/tests/gateway/client.test.ts -t "bearer token length"
```

Expected: FAIL — current request line has no bearer suffix.

- [ ] **Step 3: Append bearer indicator in `request()`**

In `cli/src/gateway/client.ts`, find:

```typescript
if (this.logger?.isVerbose) {
  this.logger.log(`Requesting ${opts.method} ${url}`);
}
```

Replace with:

```typescript
if (this.logger?.isVerbose) {
  this.logger.log(`Requesting ${opts.method} ${url} (bearer: ${this.token.length} chars)`);
}
```

- [ ] **Step 4: Update format-sensitive existing tests**

Existing tests asserting on the exact `Requesting GET <url>` string will fail. Update each:

In `describe('verbose logging', ...)`:

- `'logs the method and url before the request'` — change
  `'Requesting GET https://api.example.com/x'` to
  `'Requesting GET https://api.example.com/x (bearer: 3 chars)'` (token is `'tok'` — 3 chars).

In `describe('fromCommand', ...)`:

- `'uses the provided logger when isVerbose is true'` — change
  `'Requesting GET https://api.example.com/x'` to
  `'Requesting GET https://api.example.com/x (bearer: 3 chars)'`.

(If any other tests assert on the request line text, update similarly.)

- [ ] **Step 5: Run all client tests**

```bash
npx vitest run cli/tests/gateway/client.test.ts
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add cli/src/gateway/client.ts cli/tests/gateway/client.test.ts
git commit -m "feat(gateway): indicate bearer token length on verbose request line"
```

---

## Task 8: Thread logger through registry and introspect

**Files:**

- Modify: `cli/src/registry/registry.ts` (add `logger?` to both option types, pass to GatewayClient)
- Modify: `cli/src/codegen/introspect.ts` (add `logger?` parameter, pass to GatewayClient)
- Modify: `cli/src/commands/everywhere/publish.ts` (pass `this.createGatewayLogger()`)
- Modify: `cli/src/commands/everywhere/unpublish.ts` (pass `this.createGatewayLogger()`)
- Modify: `cli/src/commands/everywhere/bind.ts` (pass `this.createGatewayLogger()`)
- Modify: `cli/tests/registry/registry.test.ts` (add a test that forwarded logger reaches the
  client)
- Modify: `cli/tests/registry/registry-delete.test.ts` (same)
- Modify: `cli/tests/codegen/introspect.test.ts` (same)

- [ ] **Step 1: Update `cli/src/registry/registry.ts`**

Add import at the top:

```typescript
import { GatewayClient, GatewayRequestError, type VerboseLogger } from '../gateway/client.js';
```

(Combine with the existing import line; replace it entirely with this new line.)

Update both option interfaces to add `logger?: VerboseLogger`:

```typescript
export interface RegistryUploadOptions {
  gateway: string;
  token: string;
  archivePath: string;
  logger?: VerboseLogger;
}

export interface RegistryDeleteOptions {
  gateway: string;
  token: string;
  appId: string;
  logger?: VerboseLogger;
}
```

In `deleteFromRegistry`, change:

```typescript
const client = new GatewayClient({ gateway, token });
```

to:

```typescript
const client = new GatewayClient({ gateway, token, logger: options.logger });
```

In `uploadToRegistry`, do the same — replace:

```typescript
const client = new GatewayClient({ gateway, token });
```

with:

```typescript
const client = new GatewayClient({ gateway, token, logger: options.logger });
```

- [ ] **Step 2: Update `cli/src/codegen/introspect.ts`**

Add `VerboseLogger` to the existing import:

```typescript
import { GatewayClient, GatewayRequestError, type VerboseLogger } from '../gateway/client.js';
```

Find the `introspectGraphTypes` function signature and add the optional `logger` parameter at the
end:

```typescript
export async function introspectGraphTypes(
  schemas: ModelSchema[],
  sourceDir: string,
  isZip: boolean,
  logger?: VerboseLogger
): Promise<IntrospectionOutcome>;
```

(Make sure the implementation signature matches the exported one if they're separate.)

Find:

```typescript
const client = new GatewayClient({ gateway, token });
```

Replace with:

```typescript
const client = new GatewayClient({ gateway, token, logger });
```

- [ ] **Step 3: Update `cli/src/commands/everywhere/publish.ts`**

Open the file and find the call to `uploadToRegistry`. It currently looks like:

```typescript
const result = await uploadToRegistry({
  gateway,
  token,
  archivePath,
});
```

(Property names may differ slightly; the point is the call passes `gateway`, `token`,
`archivePath`.) Add `logger: this.createGatewayLogger()`:

```typescript
const result = await uploadToRegistry({
  gateway,
  token,
  archivePath,
  logger: this.createGatewayLogger(),
});
```

- [ ] **Step 4: Update `cli/src/commands/everywhere/unpublish.ts`**

Same pattern — find the call to `deleteFromRegistry` and add `logger: this.createGatewayLogger()` to
the options object.

- [ ] **Step 5: Update `cli/src/commands/everywhere/bind.ts`**

Find the call to `introspectGraphTypes`. It currently passes three positional args
(`schemas, sourceDir, isZip`). Add a fourth:

```typescript
const outcome = await introspectGraphTypes(schemas, sourceDir, isZip, this.createGatewayLogger());
```

(Variable names may differ — the call is somewhere in `bind.ts`'s `run()`. Identify by the function
name.)

- [ ] **Step 6: Add a forwarding test to `cli/tests/registry/registry.test.ts`**

Inside `describe('uploadToRegistry', ...)`, add this test:

```typescript
it('forwards the provided logger to the GatewayClient constructor', async () => {
  const logger = { isVerbose: true, log: vi.fn() };

  await uploadToRegistry({ ...baseOptions, logger });

  expect(GatewayClient).toHaveBeenCalledWith({
    gateway: 'https://registry.example.com',
    token: 'test-token',
    logger,
  });
});
```

- [ ] **Step 7: Add a forwarding test to `cli/tests/registry/registry-delete.test.ts`**

Inside `describe('deleteFromRegistry', ...)`, add this test:

```typescript
it('forwards the provided logger to the GatewayClient constructor', async () => {
  const logger = { isVerbose: true, log: vi.fn() };

  await deleteFromRegistry({ ...baseOptions, logger });

  expect(GatewayClient).toHaveBeenCalledWith({
    gateway: 'https://registry.example.com',
    token: 'test-token',
    logger,
  });
});
```

- [ ] **Step 8: Add a forwarding test to `cli/tests/codegen/introspect.test.ts`**

Add this test alongside the existing ones in the main `describe('introspectGraphTypes()', ...)`
block:

```typescript
describe('when called with a logger', () => {
  it('forwards the logger to the GatewayClient constructor', async () => {
    writeManifest('myApp_ns1');
    mockFetchOk({
      ds_Employee: { inputFields: [{ name: 'myApp_ns1_employees' }] },
      create_Employee: { name: 'MyApp_ns1_EmployeesSummary_Create_Input', kind: 'INPUT_OBJECT' },
      update_Employee: { name: 'MyApp_ns1_EmployeesSummary_Update_Input', kind: 'INPUT_OBJECT' },
    });
    const logger = { isVerbose: true, log: vi.fn() };

    await introspectGraphTypes([EMPLOYEE], tmpDir, false, logger);

    expect(GatewayClient).toHaveBeenCalledWith({
      gateway: 'https://api.workday.com',
      token: 'test-token',
      logger,
    });
  });
});
```

- [ ] **Step 9: Run the full test suite**

```bash
just check
just test
```

Expected: All tests PASS.

If `publish.test.ts` or `unpublish.test.ts` assertions on the
`uploadToRegistry`/`deleteFromRegistry` mock break (because the option object now includes a
`logger` key), update those assertions to use
`expect.objectContaining({ gateway, token, archivePath })` or to include
`logger: expect.anything()`.

- [ ] **Step 10: Commit**

```bash
git add cli/src/registry/registry.ts cli/src/codegen/introspect.ts cli/src/commands/everywhere/publish.ts cli/src/commands/everywhere/unpublish.ts cli/src/commands/everywhere/bind.ts cli/tests/registry/ cli/tests/codegen/introspect.test.ts cli/tests/commands/everywhere/
git commit -m "feat(cli): thread verbose logger through registry and introspect callers"
```

---

## Task 9: Final verification

- [ ] **Step 1: Run the full check suite**

```bash
just check
```

Expected: PASS.

- [ ] **Step 2: Run all tests**

```bash
just test
```

Expected: All tests PASS.

- [ ] **Step 3: Confirm clean tree**

```bash
git status
```

Expected: working tree clean.

- [ ] **Step 4: Confirm no stray direct fetch calls**

```bash
grep -rn "fetch(" cli/src/ --include="*.ts" | grep -v "gateway/client.ts"
```

Expected: no matches.
