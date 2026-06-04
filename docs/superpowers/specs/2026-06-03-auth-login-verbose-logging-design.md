# Design: Verbose Logging for `auth login` Token Verification

**Date:** 2026-06-03 **Branch:** feat/auth-verbose-logging

## Overview

Add verbose output to the `auth login` command's token verification flow. When `--verbose` is set,
the command logs the URL being contacted and the outcome of the HTTP request — whether it succeeds,
returns a non-2xx status, or fails at the network level.

## Scope

One file: `cli/src/commands/everywhere/auth/login.ts`

No changes to the base command, no new utilities, no new flags.

## Identity Parsing (Production Behavior)

In addition to verbose logging, the command now parses the `/me` response body to extract the
authenticated identity. This is a production behavior change — if parsing fails, login fails.

After the `!response.ok` check passes:

1. `await response.json()` — if it throws or the body is not a JSON object, the command errors with
   `Token validation response was not valid JSON.`
2. Validate `sub` and `tenant` are both present and strings — if not, the command errors with
   `Token validation response missing identity fields.`
3. On success, store the identity for use by the verbose log (point 4 below).

## Verbose Output Points

Four `if (this.isVerbose) this.log(...)` calls are added to the existing `run()` method:

1. **Before fetch** — log the URL being contacted:

   ```
   Verifying token at https://api.workday.com/api/v1/me
   ```

2. **After fetch, before the `!response.ok` check** — log the HTTP response status regardless of
   whether it succeeded or failed:

   ```
   Token verification response: 200 OK
   Token verification response: 401 Unauthorized
   ```

3. **Inside the `catch` block** (network-level failure, no response object) — log the error detail:

   ```
   Token verification request failed: fetch failed
   ```

4. **After successful identity parse** — log the authenticated identity:
   ```
   Authenticated as <sub> on tenant <tenant>
   ```

Points 2 and 3 are mutually exclusive — a network failure never produces a response, and a response
means no network failure was thrown. Point 4 only fires on the fully successful path.

## Control Flow

```
url = `${scheme}://${gateway}/api/v1/me`
[verbose] Verifying token at <url>

try {
  response = await fetch(url, ...)
} catch (err) {
  [verbose] Token verification request failed: <err.message>
  this.error(...)       ← exits
}

[verbose] Token verification response: <status> <statusText>

if (!response.ok) {
  this.error(...)       ← exits
}

try {
  body = await response.json()
  validate sub/tenant are strings
} catch (or invalid shape) {
  this.error(...)       ← exits
}

[verbose] Authenticated as <sub> on tenant <tenant>

config.write(...)
this.log('Successfully authenticated.')
```

## Testing

TDD — failing tests written before implementation:

- When `--verbose` is set and token verification succeeds: URL and response status are logged.
- When `--verbose` is set and server returns non-2xx: URL and response status are logged before the
  error.
- When `--verbose` is set and fetch throws (network error): URL and failure message are logged
  before the error.
- When the response body is not valid JSON: command errors regardless of verbose flag.
- When `sub` or `tenant` is missing from the body: command errors regardless of verbose flag.
- When `--verbose` is set and verification fully succeeds: identity (`sub` and `tenant`) is logged.
- When `--verbose` is not set: no verbose lines appear in any of the above scenarios.
