# Auth Login Verbose Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add verbose-gated logging to `auth login` token verification — URL, response status, and network errors.

**Architecture:** Three inline `if (this.isVerbose) this.log(...)` calls in `cli/src/commands/everywhere/auth/login.ts` around the existing fetch block. No new utilities, no new flags. Tests use vitest with a `log` spy and override `isVerbose` via `Object.defineProperty`.

**Tech Stack:** TypeScript, vitest, oclif

**Spec:** `docs/superpowers/specs/2026-06-03-auth-login-verbose-logging-design.md`

**Working directory:** `.worktrees/chatty-chameleon` (branch `feat/auth-verbose-logging`)

All file paths below are relative to the worktree root.

---

## Task 1: Log the verification URL when verbose

**Files:**
- Modify: `cli/src/commands/everywhere/auth/login.ts` (after URL is constructed, before `fetch`)
- Modify: `cli/tests/commands/everywhere/auth/login.test.ts` (add new `describe('verbose output')` block inside `describe('run')`)

- [ ] **Step 1: Write the failing test**

In `cli/tests/commands/everywhere/auth/login.test.ts`, add this `describe` block inside `describe('run', () => { ... })` after the existing `it('reports an auth failure...')` test:

```typescript
describe('verbose output', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    Object.defineProperty(cmd, 'isVerbose', { get: () => true, configurable: true });
    logSpy = vi.spyOn(cmd, 'log').mockImplementation(() => {});
  });

  it('logs the verification URL before contacting the server', async () => {
    await cmd.run();

    expect(logSpy).toHaveBeenCalledWith('Verifying token at https://gateway.example.com/api/v1/me');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from the worktree root:
```bash
npx vitest run cli/tests/commands/everywhere/auth/login.test.ts -t "logs the verification URL"
```

Expected: FAIL — `logSpy` not called with that string.

- [ ] **Step 3: Add the verbose log in `login.ts`**

In `cli/src/commands/everywhere/auth/login.ts`, replace the existing two lines (currently lines 45–46):

```typescript
    const scheme = https ? 'https' : 'http';
    const url = `${scheme}://${gateway}/api/v1/me`;
```

with:

```typescript
    const scheme = https ? 'https' : 'http';
    const url = `${scheme}://${gateway}/api/v1/me`;

    if (this.isVerbose) {
      this.log(`Verifying token at ${url}`);
    }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run cli/tests/commands/everywhere/auth/login.test.ts -t "logs the verification URL"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/everywhere/auth/login.ts cli/tests/commands/everywhere/auth/login.test.ts
git commit -m "feat(auth): log verification URL in verbose mode"
```

---

## Task 2: Log the response status when verbose

**Files:**
- Modify: `cli/src/commands/everywhere/auth/login.ts` (after fetch returns, before `!response.ok` check)
- Modify: `cli/tests/commands/everywhere/auth/login.test.ts` (add tests to the existing `describe('verbose output')` block from Task 1)

- [ ] **Step 1: Write the failing tests**

In `cli/tests/commands/everywhere/auth/login.test.ts`, add these two tests inside the `describe('verbose output')` block:

```typescript
it('logs the response status on success', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK' })
  );

  await cmd.run();

  expect(logSpy).toHaveBeenCalledWith('Token verification response: 200 OK');
});

it('logs the response status before failing on non-2xx', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' })
  );

  await cmd.run().catch(() => {});

  expect(logSpy).toHaveBeenCalledWith('Token verification response: 401 Unauthorized');
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run cli/tests/commands/everywhere/auth/login.test.ts -t "response status"
```

Expected: FAIL for both — log not called with the status string.

- [ ] **Step 3: Add the verbose log in `login.ts`**

In `cli/src/commands/everywhere/auth/login.ts`, between the `try { ... } catch { ... }` fetch block and the `if (!response.ok)` block, insert the verbose log. The relevant section should look like this after the change:

```typescript
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.error(`Token validation request failed: ${message}`);
    }

    if (this.isVerbose) {
      this.log(`Token verification response: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      this.error(`Token validation failed (HTTP ${response.status}).`);
    }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run cli/tests/commands/everywhere/auth/login.test.ts -t "response status"
```

Expected: PASS for both.

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/everywhere/auth/login.ts cli/tests/commands/everywhere/auth/login.test.ts
git commit -m "feat(auth): log HTTP response status in verbose mode"
```

---

## Task 3: Log network failures when verbose

**Files:**
- Modify: `cli/src/commands/everywhere/auth/login.ts` (inside the existing `catch` block)
- Modify: `cli/tests/commands/everywhere/auth/login.test.ts` (add test to `describe('verbose output')`)

- [ ] **Step 1: Write the failing test**

In `cli/tests/commands/everywhere/auth/login.test.ts`, add this test inside the `describe('verbose output')` block:

```typescript
it('logs the network error message when fetch throws', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED'))
  );

  await cmd.run().catch(() => {});

  expect(logSpy).toHaveBeenCalledWith(
    'Token verification request failed: connect ECONNREFUSED'
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run cli/tests/commands/everywhere/auth/login.test.ts -t "network error message"
```

Expected: FAIL — log not called with that string.

- [ ] **Step 3: Add the verbose log in `login.ts`**

In `cli/src/commands/everywhere/auth/login.ts`, modify the existing `catch` block so it reads:

```typescript
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (this.isVerbose) {
        this.log(`Token verification request failed: ${message}`);
      }
      this.error(`Token validation request failed: ${message}`);
    }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run cli/tests/commands/everywhere/auth/login.test.ts -t "network error message"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/everywhere/auth/login.ts cli/tests/commands/everywhere/auth/login.test.ts
git commit -m "feat(auth): log network failure detail in verbose mode"
```

---

## Task 4: Verify no verbose output when flag is unset

**Files:**
- Modify: `cli/tests/commands/everywhere/auth/login.test.ts` (add a sibling `describe` next to `describe('verbose output')`)

This task verifies the existing tests' assumption (verbose off by default) and adds an explicit
regression guard. No production code changes — the test should already pass against the current
implementation.

- [ ] **Step 1: Write the test**

In `cli/tests/commands/everywhere/auth/login.test.ts`, add this `describe` block alongside `describe('verbose output')`:

```typescript
describe('non-verbose output', () => {
  it('does not emit verbose lines when verbose is off', async () => {
    const logSpy = vi.spyOn(cmd, 'log').mockImplementation(() => {});

    await cmd.run();

    const verboseCalls = logSpy.mock.calls.filter(([msg]) =>
      typeof msg === 'string' &&
      (msg.startsWith('Verifying token at') ||
        msg.startsWith('Token verification response:') ||
        msg.startsWith('Token verification request failed:'))
    );
    expect(verboseCalls).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

```bash
npx vitest run cli/tests/commands/everywhere/auth/login.test.ts -t "does not emit verbose"
```

Expected: PASS (verbose is off by default in the existing test setup).

- [ ] **Step 3: Commit**

```bash
git add cli/tests/commands/everywhere/auth/login.test.ts
git commit -m "test(auth): guard against verbose output leaking when flag is off"
```

---

## Task 5: Full verification

- [ ] **Step 1: Run the full check suite**

```bash
just check
```

Expected: PASS (typecheck + lint clean).

- [ ] **Step 2: Run all tests**

```bash
just test
```

Expected: All tests PASS, including the new ones added in Tasks 1–4.

- [ ] **Step 3: Confirm no uncommitted changes**

```bash
git status
```

Expected: working tree clean.
