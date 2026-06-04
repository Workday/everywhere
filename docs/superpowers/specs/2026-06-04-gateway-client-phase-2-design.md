# Design: GatewayClient Phase 2 — Diagnostics and Cleanup

**Date:** 2026-06-04 **Branch:** feat/auth-verbose-logging (extends Phase 1)

## Overview

Phase 1 introduced `GatewayClient` and centralized transport for `auth login`/`auth token`, but left
three gaps: `publish`/`unpublish`/`bind` get no verbose transport logs (their helpers are pure
functions with no logger), client-side diagnostic info (proxy/CA env, timing, response bodies on
errors) is still missing, and two architectural rough edges from Phase 1 need cleanup. This phase
closes those gaps.

## Goals

1. Every command that talks to the gateway emits the same verbose transport logs.
2. A user reporting a problem can paste their `--verbose` output and a support engineer can diagnose
   the most common client-side issues (TLS chain, proxy misconfiguration, server-side errors with
   body context, latency) without access to the source.
3. Remove Phase 1's `protected → public` visibility wart and the duplicated error-surfacing pattern
   in commands.

## Scope

**In scope:**

- Thread an optional `VerboseLogger` through `uploadToRegistry`, `deleteFromRegistry`, and
  `introspectGraphTypes`. Update callers (`publish`, `unpublish`, `bind`) to pass it.
- Add diagnostic enhancements to `GatewayClient.request()`: environment dump on first request,
  request timing, response body preview on non-2xx, X-Request-Id echo, bearer header presence.
- Add `protected surfaceGatewayError(err: unknown): void` on `EverywhereBaseCommand`. Update `login`
  and `token` to use it.
- Add `protected createGatewayLogger(): VerboseLogger` on `EverywhereBaseCommand`. Change
  `GatewayClient.fromCommand` to accept a `VerboseLogger` directly. Revert `isVerbose` to
  `protected`.

**Out of scope:**

- Retry, timeout, request cancellation (still YAGNI).
- New dependencies.
- Trimming the registry error message wrappers (subjective; `--verbose` already provides the URL).

## Behavior Changes

### Verbose log lines from `GatewayClient.request()`

Replace the current three log lines with this richer sequence. Format choices match what was agreed
in design discussion.

**Environment dump** (first request only, per process; uses a module-level flag):

```
Environment:
  Node: v22.5.1
  HTTPS_PROXY: (not set)
  HTTP_PROXY: (not set)
  NO_PROXY: (not set)
  NODE_EXTRA_CA_CERTS: (not set)
  NODE_TLS_REJECT_UNAUTHORIZED: (default)
```

For variables that are set, the value is shown verbatim. `NODE_TLS_REJECT_UNAUTHORIZED` shows
`(default)` if unset and the value (`0` or `1`) if set.

**Request line** (every request):

```
Requesting GET https://api.example.com/api/v1/me (bearer: 245 chars)
```

The bearer length is `this.token.length` — no token content leaks.

**Response line** (every successful response, before status check):

```
Response: 200 OK (243ms)
```

Timing is `Date.now()` after fetch minus `Date.now()` before fetch.

**X-Request-Id line** (when present in response headers, case-insensitive):

```
X-Request-Id: abc-123-def
```

Logged on its own line immediately after the Response line.

**Response body line** (only when `!response.ok`):

```
Response body: {"error":"missing field 'tenant'"}
```

Reads `await response.text()` (consuming the body — important since the client throws and the caller
never reads it). Truncated to 500 characters with `… (truncated)` suffix if longer. Skipped if the
body is empty.

**Failure line** (on network error):

```
Request failed: UNABLE_TO_GET_ISSUER_CERT_LOCALLY: unable to get local issuer certificate (12ms)
```

Existing format with timing appended.

### Function signature changes

```typescript
// cli/src/registry/registry.ts
export interface RegistryUploadOptions {
  gateway: string;
  token: string;
  archivePath: string;
  logger?: VerboseLogger; // NEW
}

export interface RegistryDeleteOptions {
  gateway: string;
  token: string;
  appId: string;
  logger?: VerboseLogger; // NEW
}

// cli/src/codegen/introspect.ts
export async function introspectGraphTypes(
  schemas: ModelSchema[],
  sourceDir: string,
  isZip: boolean,
  logger?: VerboseLogger // NEW (optional last arg, no caller breakage)
): Promise<IntrospectionOutcome>;
```

Callers (`publish.ts`, `unpublish.ts`, `bind.ts`) pass `this.createGatewayLogger()` (see below).
Existing callers in tests that omit the logger continue to work; verbose logging is silently skipped
without a logger.

### `EverywhereBaseCommand` additions

```typescript
// cli/src/lib/command.ts
import type { VerboseLogger } from '../gateway/client.js';
import { GatewayRequestError } from '../gateway/client.js';

abstract class EverywhereBaseCommand extends Command {
  // Revert to protected (was made public in Phase 1 as a hack)
  protected get isVerbose(): boolean { ... }

  // NEW: returns a VerboseLogger bound to this command
  protected createGatewayLogger(): VerboseLogger {
    return {
      get isVerbose() {
        return this.isVerbose; // late-bound via getter
      },
      log: (msg: string) => this.log(msg),
    };
    // NOTE: implementation needs to bind `this` correctly — see plan for details
  }

  // NEW: standardized error surfacing for GatewayRequestError
  protected surfaceGatewayError(err: unknown): never {
    if (err instanceof GatewayRequestError) this.error(err.message);
    throw err;
  }
}
```

### `GatewayClient.fromCommand` signature change

```typescript
// Before (Phase 1)
static fromCommand(
  cmd: { readonly isVerbose: boolean; log(message: string): void },
  opts: { gateway: string; token: string }
): GatewayClient;

// After (Phase 2)
static fromCommand(
  logger: VerboseLogger,
  opts: { gateway: string; token: string }
): GatewayClient;
```

Callers change from `GatewayClient.fromCommand(this, opts)` to
`GatewayClient.fromCommand(this.createGatewayLogger(), opts)`. The static factory now has no
knowledge of commands — it just wires a logger.

The existing duck-typed parameter (`{ isVerbose; log }`) was always essentially a `VerboseLogger`
anyway, so this is the type that should have been declared from the start.

### Command error-surfacing simplification

Before (login.ts and token.ts):

```typescript
try {
  body = await client.getJson('/api/v1/me');
} catch (err) {
  if (err instanceof GatewayRequestError) this.error(err.message);
  throw err;
}
```

After:

```typescript
try {
  body = await client.getJson('/api/v1/me');
} catch (err) {
  this.surfaceGatewayError(err);
}
```

## Architecture

### Diagnostic state — once-per-process env dump

Use a module-level `let envLogged = false;` flag in `client.ts`. The first time `request()` is
called _with_ a verbose logger, dump the env block before the Requesting line, then set the flag. A
test helper exposed only via internal import resets the flag for tests (`resetEnvLoggedForTesting`).

### Reading the response body on error

The current `request()` throws `GatewayRequestError` on non-2xx. To log the body, it must consume
the body itself before throwing. That's safe because the caller never sees the response in the error
path. Use `try { body = await response.text() } catch { body = '' }` to be defensive against
unreadable bodies.

The body preview is logged but **not** included in the error message — error messages stay short.
The body is in the verbose log right next to the Response line.

### Timing

`const start = Date.now();` immediately before fetch. `const elapsed = Date.now() - start;` after.
Appended to both the success and failure log lines.

## Testing

Vitest, behavior-driven, one expectation per case.

### Client tests — new `describe` blocks

- **environment dump**
  - logs the env block before the first request when verbose
  - does not repeat on the second request (per-process flag)
  - shows `(not set)` for unset env vars
  - shows actual value for set env vars
- **request timing**
  - includes `(<N>ms)` in the Response line
  - includes timing on the failure line for network errors
- **response body on non-2xx**
  - logs `Response body: <truncated>` when status check fails and body is non-empty
  - skips body line when body is empty
  - truncates body longer than 500 chars
- **X-Request-Id echo**
  - logs `X-Request-Id: <value>` when the response header is present
  - skips when absent
  - case-insensitive header lookup
- **bearer presence indicator**
  - appends `(bearer: N chars)` to the Requesting line where N is the token length

Existing tests for happy path / status check / cause unwrap stay green (asserted against the new
line formats where they overlap).

### Base command tests

- **createGatewayLogger**
  - returns a logger whose `isVerbose` reflects the command's current verbose state (late-bound)
  - returns a logger whose `log` forwards to `cmd.log`
- **surfaceGatewayError**
  - calls `this.error(err.message)` when given a `GatewayRequestError`
  - rethrows non-`GatewayRequestError` errors unchanged

### Migrated function tests

For each of `uploadToRegistry` / `deleteFromRegistry` / `introspectGraphTypes`:

- when called with a logger, that logger is forwarded to the GatewayClient constructor
- when called without a logger, no logger reaches the client (existing behavior preserved)

### Command tests (publish, unpublish, bind)

- when run, the command calls the registry/introspect function with a logger derived from itself
- behavior is unchanged when called without --verbose

## Migration Order

Tasks are sequenced so each can be reviewed in isolation:

1. Visibility refactor first (changes the `fromCommand` signature — everything else builds on the
   final shape).
2. Error-surface helper (one new method, two call site updates).
3. Diagnostic enhancements to `request()` — five small additions in order: env dump, timing, body
   preview, X-Request-Id, bearer indicator.
4. Logger threading through `uploadToRegistry` / `deleteFromRegistry` / `introspectGraphTypes` and
   their callers.

## Risks

- **Reading the response body on error consumes it.** If anything downstream of `request()` tries to
  read the body of a failed response, it gets an empty stream. Today nothing does (the client throws
  and the body is gone), so this is fine — but if future code uses `request()` directly and tries to
  read a failed response's body, that's a footgun. Mitigation: the spec is explicit; add an inline
  comment in the code.
- **Env dump on first call could fire from unexpected contexts.** If tests share module state across
  files, one test's env dump could suppress another's expected log. Mitigation: provide
  `resetEnvLoggedForTesting()` and call it in `beforeEach` of relevant tests.
- **`createGatewayLogger`'s `this` binding is tricky.** The returned object uses `cmd.isVerbose`
  inside a getter — needs to capture `this` correctly. The plan spells out the exact code.
