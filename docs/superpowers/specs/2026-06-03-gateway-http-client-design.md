# Design: GatewayClient — Shared HTTP Client for CLI Commands

**Date:** 2026-06-03 **Branch:** feat/auth-verbose-logging (continues from verbose-logging work)

## Overview

Consolidate the fetch + auth + error-handling + verbose-logging pattern duplicated across five CLI
call sites into a single `GatewayClient`. The client owns all network/HTTP logging; commands keep
only command-level logging (interactive prompts, success messages, domain validation).

## Motivation

Today, every command that talks to the gateway reimplements: bearer-auth header construction, URL
joining, `try/catch` around `fetch`, `err.cause` unwrapping, `response.ok` check, conditional
`response.json()` parsing, and verbose log decisions. The styles vary — some commands log nothing,
some throw structured errors, some call `this.error()` inline. New commands inherit whatever pattern
their author copied from. The branch-in-progress for `auth login` is a microcosm: it added good
behavior in one place, but the same fixes need to land in four other places to be consistent.

## Scope

**In scope** — migrate every direct `fetch` call in `cli/src` to go through `GatewayClient`:

- `cli/src/commands/everywhere/auth/login.ts`
- `cli/src/commands/everywhere/auth/token.ts`
- `cli/src/registry/registry.ts` (publish + unpublish)
- `cli/src/codegen/introspect.ts` (via the escape-hatch `request()` for GraphQL)

**Out of scope:**

- Retry, timeout, request cancellation, connection pooling — YAGNI for current call sites.
- Replacing existing GraphQL response handling in `introspect.ts` beyond switching its transport
  (the GraphQL error-checking logic stays put).
- A new dependency. The client is built on Node's built-in `fetch` plus the standard `URL`.

## Architecture

A single class with a small public surface, plus one error type.

### Location

- `cli/src/gateway/client.ts` — class and helpers
- `cli/src/gateway/client.test.ts` — unit tests (vitest)

(`cli/src/auth/gateway.ts` from main already owns `parseGatewayUrl`. The new `gateway/` directory
holds transport concerns. They could merge later if both stay small, but starting separately keeps
responsibilities clear.)

### Public API

```typescript
export interface ClientOptions {
  gateway: string; // parsed gateway URL (e.g. "https://api.workday.com")
  token: string; // bearer token
}

export interface RequestOptions {
  method: 'GET' | 'POST' | 'DELETE';
  path: string; // joined onto gateway via new URL(path, gateway)
  body?: unknown; // JSON-serialized when present
  headers?: Record<string, string>; // merged onto defaults
}

export class GatewayClient {
  static fromCommand(cmd: EverywhereBaseCommand, opts: ClientOptions): GatewayClient;

  getJson<T>(path: string): Promise<T>;
  postJson<T>(path: string, body: unknown): Promise<T>;
  delete(path: string): Promise<void>;
  getText(path: string): Promise<string>;

  // Escape hatch for callers that need raw access (e.g. introspect's GraphQL response shape).
  // Returns the raw Response after the status check passes; throws GatewayRequestError on
  // network failure or non-2xx.
  request(opts: RequestOptions): Promise<Response>;
}
```

The typed `getJson` / `postJson` exist for ergonomics — they don't validate response shape (callers
do that). `delete` returns void because callers today never use the response body.

### Error Type

```typescript
export class GatewayRequestError extends Error {
  readonly method: string;
  readonly url: string;
  readonly status?: number; // present for non-2xx
  readonly code?: string; // present for network errors (TLS, DNS, etc.)
  // .cause is the original Error from fetch / response.json

  constructor(message: string, fields: { method; url; status?; code?; cause?: Error });
}
```

The `message` is already user-facing — commands can pass it straight to `this.error()`. Examples:

- `GET https://api.workday.com/api/v1/me failed: UNABLE_TO_GET_ISSUER_CERT_LOCALLY: unable to get local issuer certificate`
- `POST https://api.workday.com/api/v1/apps/publish failed: HTTP 401 Unauthorized`
- `GET https://api.workday.com/api/v1/me failed: response was not valid JSON`

## Behavior

For every request, the client performs these steps in order:

1. Build the full URL with `new URL(path, gateway).toString()`.
2. Verbose: `Requesting <METHOD> <url>` (if `cmd.isVerbose`).
3. `try { fetch(...) }` with bearer header + caller headers merged.
4. On thrown error: unwrap the `cause` chain (existing `describeFetchError` logic) and throw
   `GatewayRequestError` with method, url, code, and message.
5. Verbose: `Response: <status> <statusText>` (if `cmd.isVerbose`).
6. If `!response.ok`: throw `GatewayRequestError` with method, url, status, and a status-based
   message.
7. For `getJson` / `postJson`: `try { await response.json() }`; on throw, raise
   `GatewayRequestError` with method, url, and a parse-failed message.
8. For `delete`: return after the status check.
9. For `getText`: return `await response.text()`.
10. For `request`: return the raw `Response`.

### Verbose log lines (client-owned)

| Phase   | Format                                |
| ------- | ------------------------------------- |
| Start   | `Requesting <method> <url>`           |
| Success | `Response: <status> <statusText>`     |
| Failure | `Request failed: <unwrapped message>` |

These replace today's command-level `Verifying token at ...` / `Token verification response: ...`
lines. Commands stop emitting transport-level logs entirely.

## Migration

After the client is built, each call site migrates in a separate commit so each change is reviewable
and revertible.

### `auth/login.ts`

```typescript
const client = GatewayClient.fromCommand(this, { gateway, token });
let identity: { sub: string; tenant: string };
try {
  identity = await client.getJson<{ sub: string; tenant: string }>('/api/v1/me');
} catch (err) {
  if (err instanceof GatewayRequestError) this.error(err.message);
  throw err;
}
// Shape validation stays here (sub/tenant strings)
// Identity log stays here ("Authenticated as ...")
```

The local `describeFetchError` helper, the URL construction, the try/catch around fetch, the
`!response.ok` check, the JSON parse, the "not valid JSON" error, and the three transport-level
verbose logs all move into the client. The login command shrinks notably.

### `auth/token.ts`, `registry.ts`, `introspect.ts`

Same pattern: replace local fetch + error handling with the client. `introspect.ts` uses
`client.request({ method: 'POST', path: '/api/v1/data/graphql', body: ... })` and keeps its
GraphQL-aware response handling.

## Testing

Vitest, behavior-driven, one expectation per case (project convention).

### Client tests (`cli/src/gateway/client.test.ts`)

Each behavior gets its own `describe` block:

- **construction** — factory wires command logger and isVerbose correctly.
- **getJson** — returns parsed JSON on success; throws `GatewayRequestError` on network error,
  non-2xx, and invalid JSON.
- **postJson** — sends JSON body with correct content-type header.
- **delete** — issues DELETE and returns when status check passes.
- **getText** — returns response body as text.
- **request** — escape hatch returns raw Response after status check.
- **error unwrapping** — `err.cause` chain is walked to extract code+message (covers the existing
  `describeFetchError` behavior).
- **verbose logging** — three line formats emit when `cmd.isVerbose`; nothing emits when off.
- **bearer auth** — Authorization header is set on every request.

### Command tests

Each migrated command file gets its existing fetch-mocking tests rewritten to mock the
`GatewayClient` instead of global `fetch`. The behavior surface stays the same: same observable
output, same error messages, same verbose lines (now coming from the client, asserted in client
tests rather than command tests).

## Risks

- **Test rewrites are wide** — every command file's fetch mocks change. Mitigated by keeping the
  client API small (only the methods commands actually use) and migrating one command per commit.
- **Loss of per-call-site error message customization** — today each site can phrase its error
  differently. The client's standardized error message format may read worse for one or two sites.
  If so, commands can wrap or rewrite the message before calling `this.error()`.
- **GraphQL escape hatch may grow** — if `introspect.ts` needs more from the client over time, we
  may add a `postJson` variant for GraphQL that handles `errors` arrays. Defer until needed.
