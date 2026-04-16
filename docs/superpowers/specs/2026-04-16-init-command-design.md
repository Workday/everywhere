# `everywhere init` Command

## Summary

Add a new `everywhere init` subcommand that scaffolds a stub Workday Everywhere plugin inside an
existing npm project. The command verifies `package.json` exists, reads the project name,
idempotently adds `@workday/everywhere` + `react` + `react-dom` to `dependencies`, and writes a
`plugin.tsx` templated with the project name. No network calls — it doesn't run `npm install`;
instead it prints a next-steps hint.

## Motivation

A new user adopting the SDK today must hand-copy the `hello` example and remember to install the
right dependency set. `init` reduces bootstrapping to a single command and makes the expected
project shape explicit.

## Design

### Flags and arguments

No positional args. Inherits everything from `EverywhereBaseCommand.baseFlags`:

- `--plugin-dir` / `-D` — target directory (default: cwd)
- `--verbose` / `-v` — consumed for extra diagnostic output (see below)

No new flags. No `--force`, no `--install`, no template variant. YAGNI for v1.

**Description string:** `Scaffold a stub Workday Everywhere plugin in an existing npm project.`

### Flow

Four pre-checks run in order before any mutation:

1. `{pluginDir}/package.json` exists (else error)
2. `package.json` parses as JSON (parse error bubbles up naturally)
3. `package.json` has a non-empty `name` string (else error)
4. Neither `{pluginDir}/plugin.tsx` nor `{pluginDir}/plugin.ts` exists (else error)

Two mutations happen after all pre-checks pass:

1. Merge `@workday/everywhere`, `react`, `react-dom` into `package.json.dependencies` (idempotently
   — existing entries are left alone). If at least one dep was actually added, write `package.json`
   back to disk. If all three were already present, skip the write entirely — no reason to rewrite
   an unchanged file.
2. Write `{pluginDir}/plugin.tsx` using the inline template with the user's project name
   substituted.

### Error messages

- **No package.json:** `No package.json found in {pluginDir}. Run \`npm init\` first.`
- **Missing name field:** `package.json must have a "name" field.`
- **Plugin file already exists:**
  `Plugin file already exists: {path}. Remove it first or run from a fresh directory.`

Emitted via `this.error()` so oclif formats them consistently. No chalk on error messages — oclif
already styles them.

### Dependency versions

- **`@workday/everywhere`** — read the SDK's own version at runtime (from the root `package.json` of
  the installed package) and use `^${currentVersion}`. Keeps the scaffolded range aligned with the
  CLI version the user is running.
- **`react`** — hardcoded `^19` (matches the `hello` example and the SDK's current dev target)
- **`react-dom`** — hardcoded `^19`

All three added to `dependencies` (not `devDependencies`).

### Non-verbose output

Minimum set needed to confirm state changes and orient the user toward next steps. When at least one
dep was added:

```
Updated package.json
Created plugin.tsx
Run `npm install` to install dependencies.
```

When all three deps were already present (no `package.json` write happened), the first line is
omitted:

```
Created plugin.tsx
Run `npm install` to install dependencies.
```

### Verbose output (`-v`)

Adds diagnostic detail before / alongside each step:

```
Package: my-project@1.0.0 (/abs/path/package.json)
Adding dependency: @workday/everywhere ^0.1.0
Adding dependency: react ^19
Adding dependency: react-dom ^19
Updated package.json
Writing /abs/path/plugin.tsx
Created plugin.tsx
Run `npm install` to install dependencies.
```

When a dep is already present:

```
Dependency already present: @workday/everywhere (keeping ^0.1.0)
```

When all three deps were already present, the `Updated package.json` line is replaced with:

```
No changes to package.json
```

### Output styling (chalk)

`init` is the first command that uses `chalk` for non-error output. (Other commands stay on plain
`this.log` for now — not in this PR's scope.) Intended palette:

- **Cyan** for file paths (e.g., the `package.json` location in verbose, the `plugin.tsx` path being
  written)
- **Green** for state-change confirmation lines (`Updated package.json`, `Created plugin.tsx`)
- **Dim** for version annotations (the `^0.1.0`, `^19` suffixes)

Exact chalk application is an implementation-plan detail; the guiding principle is semantic color
use, not rainbow.

### Stub template

Inline template string in `cli/src/init-template.ts`. `renderStub(name)` returns:

```tsx
import { plugin } from '@workday/everywhere';

function HomePage() {
  return (
    <div style={{ padding: 16 }}>
      <h1>Welcome to ${name}!</h1>
      <p>This is a simple plugin with a single page.</p>
    </div>
  );
}

export default plugin({
  pages: [{ id: 'home', title: 'Home', component: HomePage }],
});
```

The `${name}` token in the snippet above is placeholder notation for the reader — in the rendered
output file, it is replaced with the raw `name` string read from `package.json` (e.g.,
`<h1>Welcome to my-project!</h1>`). The implementation can use a JavaScript template literal inside
`renderStub(name)`, since `${name}` is already the native interpolation syntax.

No escaping is needed — npm package names are constrained to lowercase letters, digits, hyphens,
dots, underscores, and optional `@scope/` prefix; none of those characters are JSX- or JS-hazardous.

**Not using `examples/hello/plugin.tsx` as the canonical source this PR.** The
single-source-of-truth idea is appealing but requires deciding a delivery mechanism (ship
`examples/` with the package, move canonical to `cli/templates/`, or generate the template at build
time) and adopting a placeholder convention in hello. Not essential for shipping `init`; drift cost
is low for 14 lines. Revisit as a follow-up.

### Architecture / file structure

| File                                                  | Responsibility                                               |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| `cli/src/commands/everywhere/init.ts` (create)        | Init command class — orchestrates checks, mutations, logging |
| `cli/src/init-template.ts` (create)                   | Pure `renderStub(name: string): string`                      |
| `cli/tests/init-template.test.ts` (create)            | Behavior tests for `renderStub`                              |
| `cli/tests/commands/everywhere/init.test.ts` (create) | Introspection tests for the command                          |

**What lives where:**

- Stub template + substitution → `init-template.ts`. Pure, no I/O.
- `package.json` read / merge / write → inline in `init.ts`. Small enough that a helper module would
  be premature. Extract later if logic grows.
- Reading the SDK's own version → at runtime, read the root `package.json` via a path relative to
  the compiled `init.ts` output. Implementation plan will pin down the exact path.
- Chalk imports and usage → inline in `init.ts`.

### Testing

- **`renderStub`** (behavior): unit tests for typical names, scoped names (`@scope/pkg`), names with
  hyphens/dots/underscores. Verify `Welcome to {name}!` appears in the output, verify imports and
  `plugin()` call are present.
- **`init` command** (introspection): command class exists, description matches, inherits
  `plugin-dir` and `verbose` flags from base, has no positional args.
- **Command `run()` is not end-to-end tested** — matches the project's existing pattern (bind,
  install, etc. aren't either). Manual smoke test covers integration.

### Manual smoke test plan

Scenarios to run before merging:

1. Fresh project:
   `mkdir /tmp/init-test && cd /tmp/init-test && npm init -y && npx everywhere init -D .`
   - Verify: `package.json` now has `@workday/everywhere`, `react`, `react-dom` in `dependencies`
     with expected version ranges
   - Verify: `plugin.tsx` exists with welcome text including the project name
2. Second run in same dir: `npx everywhere init -D .`
   - Expected: errors on `plugin.tsx` already exists; `package.json` unchanged
3. Verbose: `npx everywhere init -D . -v` in a fresh dir
   - Verify: all verbose diagnostic lines appear
4. Missing `package.json`: `mkdir /tmp/no-init && cd /tmp/no-init && npx everywhere init -D .`
   - Expected: errors with "No package.json found..."
5. `package.json` without name: create one via `echo '{}' > package.json`, run init
   - Expected: errors with `package.json must have a "name" field.`
6. Partial re-init: pre-populate `package.json` with one of the three deps at a custom version,
   remove `plugin.tsx` if present, run init
   - Expected: existing dep version preserved; other two deps added; plugin.tsx written

## Scope

**In scope:**

- New `init` command at `cli/src/commands/everywhere/init.ts`
- `renderStub` helper at `cli/src/init-template.ts` with unit tests
- `package.json` read / idempotent merge / write, inline in init.ts
- `chalk`-styled verbose and non-verbose output, errors unchalked (oclif handles)
- Command introspection test
- Manual smoke test

**Out of scope:**

- Running `npm install` (user runs it)
- `--force` / overwrite flag (rm + rerun is the escape hatch)
- Template variants (JS instead of TS, richer starter, multi-page, etc.)
- Hello example becoming the canonical template source (future follow-up)
- Chalk migration for other commands (future follow-up; current PR introduces the precedent)
- Scripts added to `package.json` (e.g., `"preview": "everywhere view"`) — user adds themselves
- Scaffolding of `everywhere/` subdirectory (only relevant after `bind`)
