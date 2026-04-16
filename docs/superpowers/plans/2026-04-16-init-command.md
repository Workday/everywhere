# `everywhere init` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `everywhere init` subcommand that scaffolds a stub Workday Everywhere plugin inside
an existing npm project — verifies `package.json`, idempotently adds three deps, and writes a
templated `plugin.tsx`.

**Architecture:** One new command class at `cli/src/commands/everywhere/init.ts` orchestrates
pre-checks, a `package.json` read-merge-write, and a plugin file write. The stub template is a pure
function at `cli/src/init-template.ts` that returns a string. The command reads the SDK's own
version at runtime from the root `package.json` via a path relative to its compiled location. Chalk
styles non-error output (green for state-change confirmations, cyan for paths, dim for version
strings).

**Tech Stack:** TypeScript, oclif, vitest, chalk, node:fs, node:path, node:url

---

## File Structure

| File                                                  | Responsibility                                               |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| `cli/src/init-template.ts` (create)                   | Pure `renderStub(name: string): string`                      |
| `cli/tests/init-template.test.ts` (create)            | Behavior tests for `renderStub`                              |
| `cli/src/commands/everywhere/init.ts` (create)        | Init command class — orchestrates checks, mutations, logging |
| `cli/tests/commands/everywhere/init.test.ts` (create) | Introspection tests for the command                          |

---

### Task 1: `renderStub` helper

Create a pure function that returns the stub `plugin.tsx` content with the project name interpolated
into the welcome heading.

**Files:**

- Create: `cli/src/init-template.ts`
- Create: `cli/tests/init-template.test.ts`

Follow TDD: failing test first, then minimal implementation. One expectation per `it`.

- [ ] **Step 1: Write failing test for return type**

Create `cli/tests/init-template.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { renderStub } from '../src/init-template.js';

describe('renderStub', () => {
  describe('when called with a name', () => {
    it('returns a string', () => {
      expect(typeof renderStub('my-plugin')).toBe('string');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart && npx vitest run cli/tests/init-template.test.ts`
Expected: FAIL — module `../src/init-template.js` not found.

- [ ] **Step 3: Write minimal implementation**

Create `cli/src/init-template.ts`:

```typescript
export function renderStub(name: string): string {
  return `import { plugin } from '@workday/everywhere';

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
`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart && npx vitest run cli/tests/init-template.test.ts`
Expected: PASS.

- [ ] **Step 5: Write failing test for name interpolation**

Add to the `renderStub` describe:

```typescript
describe('when called with a typical npm name', () => {
  it('interpolates the name into the welcome heading', () => {
    expect(renderStub('my-plugin')).toContain('<h1>Welcome to my-plugin!</h1>');
  });
});
```

- [ ] **Step 6: Run test to verify it passes**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart && npx vitest run cli/tests/init-template.test.ts`
Expected: PASS (already implemented).

- [ ] **Step 7: Write failing test for scoped name interpolation**

Add to the `renderStub` describe:

```typescript
describe('when called with a scoped name', () => {
  it('interpolates the scoped name verbatim', () => {
    expect(renderStub('@workday/my-plugin')).toContain('<h1>Welcome to @workday/my-plugin!</h1>');
  });
});
```

- [ ] **Step 8: Run test to verify it passes**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart && npx vitest run cli/tests/init-template.test.ts`
Expected: PASS.

- [ ] **Step 9: Write failing test for import line**

Add a new `regardless of name` describe block inside the `renderStub` describe, with one `it`:

```typescript
describe('regardless of name', () => {
  it('imports plugin from @workday/everywhere', () => {
    expect(renderStub('anything')).toContain("import { plugin } from '@workday/everywhere';");
  });
});
```

- [ ] **Step 10: Run test to verify it passes**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart && npx vitest run cli/tests/init-template.test.ts`
Expected: PASS.

- [ ] **Step 11: Write failing test for default plugin export**

Add a second `it` inside the existing `regardless of name` describe:

```typescript
it('calls plugin() with a pages array containing a home page', () => {
  const result = renderStub('anything');
  expect(result).toContain("pages: [{ id: 'home', title: 'Home', component: HomePage }]");
});
```

- [ ] **Step 12: Run test to verify it passes**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart && npx vitest run cli/tests/init-template.test.ts`
Expected: PASS.

- [ ] **Step 13: Write failing test for trailing newline**

Add a third `it` inside the same `regardless of name` describe:

```typescript
it('ends with a single newline', () => {
  expect(renderStub('anything').endsWith('\n')).toBe(true);
});
```

- [ ] **Step 14: Run test to verify it passes**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart && npx vitest run cli/tests/init-template.test.ts`
Expected: PASS.

- [ ] **Step 15: Run the full test suite**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart && npx vitest run`
Expected: PASS (ignoring pre-existing auth/info failures that predate this branch).

- [ ] **Step 16: Commit**

```bash
git add cli/src/init-template.ts cli/tests/init-template.test.ts
git commit -m "feat(cli): add renderStub helper for init command"
```

---

### Task 2: Init command class — scaffold and introspection

Create the minimal command class so the introspection tests can assert structural correctness.
`run()` body is a placeholder at this stage — Task 3 fills it in. This mirrors the pattern used when
the `install` command was scaffolded.

**Files:**

- Create: `cli/src/commands/everywhere/init.ts`
- Create: `cli/tests/commands/everywhere/init.test.ts`

- [ ] **Step 1: Write failing test for command existence**

Create `cli/tests/commands/everywhere/init.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import InitCommand from '../../../src/commands/everywhere/init.js';
import EverywhereBaseCommand from '../../../src/commands/everywhere/base.js';

describe('everywhere init', () => {
  it('exists as a command class', () => {
    expect(InitCommand).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart && npx vitest run cli/tests/commands/everywhere/init.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal command class**

Create `cli/src/commands/everywhere/init.ts`:

```typescript
import EverywhereBaseCommand from './base.js';

export default class InitCommand extends EverywhereBaseCommand {
  static description = 'Scaffold a stub Workday Everywhere plugin in an existing npm project.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    // Implementation lands in Task 3
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart && npx vitest run cli/tests/commands/everywhere/init.test.ts`
Expected: PASS.

- [ ] **Step 5: Write failing test for description**

Add to the `everywhere init` describe block:

```typescript
describe('description', () => {
  it('describes scaffolding a stub plugin', () => {
    expect(InitCommand.description).toBe(
      'Scaffold a stub Workday Everywhere plugin in an existing npm project.'
    );
  });
});
```

- [ ] **Step 6: Run test to verify it passes**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart && npx vitest run cli/tests/commands/everywhere/init.test.ts`
Expected: PASS (already implemented).

- [ ] **Step 7: Write failing test for inherited plugin-dir flag**

Add to the `everywhere init` describe block:

```typescript
describe('flags', () => {
  it('inherits the plugin-dir flag from the base command', () => {
    expect(InitCommand.flags['plugin-dir']).toBe(EverywhereBaseCommand.baseFlags['plugin-dir']);
  });
});
```

- [ ] **Step 8: Run test to verify it passes**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart && npx vitest run cli/tests/commands/everywhere/init.test.ts`
Expected: PASS (already inherited via `...baseFlags`).

- [ ] **Step 9: Write failing test for inherited verbose flag**

Add to the `flags` describe inside `everywhere init`:

```typescript
it('inherits the verbose flag from the base command', () => {
  expect(InitCommand.flags['verbose']).toBe(EverywhereBaseCommand.baseFlags['verbose']);
});
```

- [ ] **Step 10: Run test to verify it passes**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart && npx vitest run cli/tests/commands/everywhere/init.test.ts`
Expected: PASS.

- [ ] **Step 11: Run the full test suite**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart && npx vitest run`
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add cli/src/commands/everywhere/init.ts cli/tests/commands/everywhere/init.test.ts
git commit -m "feat(cli): scaffold init command with shared base flags"
```

---

### Task 3: Implement `init` command `run()` — pre-checks, mutations, and verbose output

Fill in the empty `run()` with: four pre-checks, two mutations (optionally skipping the
`package.json` write when nothing changed), and chalk-styled output that adapts to `--verbose`. This
task also wires in the SDK version lookup at runtime.

**Files:**

- Modify: `cli/src/commands/everywhere/init.ts`

- [ ] **Step 1: Replace init.ts with the full implementation**

Replace the entire contents of `cli/src/commands/everywhere/init.ts` with:

```typescript
import chalk from 'chalk';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import EverywhereBaseCommand from './base.js';
import { renderStub } from '../../init-template.js';

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
// init.ts compiles to cli/dist/commands/everywhere/init.js, so the SDK's root
// package.json is four levels up. Both dev and published layouts match.
const SDK_PKG_PATH = path.resolve(THIS_DIR, '../../../../package.json');

function getSdkVersion(): string {
  const pkg = JSON.parse(fs.readFileSync(SDK_PKG_PATH, 'utf-8')) as { version: string };
  return pkg.version;
}

export default class InitCommand extends EverywhereBaseCommand {
  static description = 'Scaffold a stub Workday Everywhere plugin in an existing npm project.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(InitCommand);
    const pluginDir = await this.parsePluginDir();
    const verbose = flags.verbose;

    // Pre-check 1: package.json exists
    const pkgPath = path.join(pluginDir, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      this.error(`No package.json found in ${pluginDir}. Run \`npm init\` first.`);
    }

    // Pre-check 2: package.json parses and has a name
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
      name?: string;
      version?: string;
      dependencies?: Record<string, string>;
    };
    if (!pkg.name || typeof pkg.name !== 'string') {
      this.error('package.json must have a "name" field.');
    }

    // Pre-check 3: plugin file doesn't already exist
    const tsxPath = path.join(pluginDir, 'plugin.tsx');
    const tsPath = path.join(pluginDir, 'plugin.ts');
    for (const existing of [tsxPath, tsPath]) {
      if (fs.existsSync(existing)) {
        this.error(
          `Plugin file already exists: ${existing}. Remove it first or run from a fresh directory.`
        );
      }
    }

    // Verbose: announce which package.json we're operating on
    if (verbose) {
      const version = pkg.version ?? 'unknown';
      this.log(`Package: ${pkg.name}@${version} (${chalk.cyan(pkgPath)})`);
    }

    // Compute dep additions vs skipped
    const sdkVersion = getSdkVersion();
    const desiredDeps: Record<string, string> = {
      '@workday/everywhere': `^${sdkVersion}`,
      react: '^19',
      'react-dom': '^19',
    };
    const existingDeps: Record<string, string> = pkg.dependencies ?? {};
    const added: Array<{ name: string; version: string }> = [];
    const skipped: Array<{ name: string; existingVersion: string }> = [];

    for (const [name, version] of Object.entries(desiredDeps)) {
      if (name in existingDeps) {
        skipped.push({ name, existingVersion: existingDeps[name] });
      } else {
        added.push({ name, version });
      }
    }

    // Verbose: per-dep lines
    if (verbose) {
      for (const { name, version } of added) {
        this.log(`Adding dependency: ${name} ${chalk.dim(version)}`);
      }
      for (const { name, existingVersion } of skipped) {
        this.log(`Dependency already present: ${name} (keeping ${chalk.dim(existingVersion)})`);
      }
    }

    // Mutation 1: write package.json if anything was added
    if (added.length > 0) {
      const newDeps = { ...existingDeps };
      for (const { name, version } of added) {
        newDeps[name] = version;
      }
      const newPkg = { ...pkg, dependencies: newDeps };
      fs.writeFileSync(pkgPath, JSON.stringify(newPkg, null, 2) + '\n');
      this.log(chalk.green('Updated package.json'));
    } else if (verbose) {
      this.log('No changes to package.json');
    }

    // Verbose: announce the plugin.tsx write
    if (verbose) {
      this.log(`Writing ${chalk.cyan(tsxPath)}`);
    }

    // Mutation 2: write plugin.tsx
    fs.writeFileSync(tsxPath, renderStub(pkg.name));
    this.log(chalk.green('Created plugin.tsx'));

    // Next-steps hint
    this.log('Run `npm install` to install dependencies.');
  }
}
```

Key behaviors:

- SDK version is read from the root `package.json` at runtime via a path relative to the compiled
  `init.js` location. If the root package ever changes layout, this path needs updating.
- All four pre-checks run before any mutation — failed pre-check aborts the command via
  `this.error()` (which throws `CLIError` and never returns).
- Idempotent dep merge: existing entries left alone; `skipped` array captures them for the verbose
  output.
- `package.json` is written only if at least one dep was added.
- `plugin.tsx` is always written (pre-check 3 guaranteed it doesn't yet exist).
- Non-verbose shows only the two state-change confirmations + next-steps line. Verbose adds
  diagnostic detail before each step.
- Chalk palette: `chalk.green` for state-change lines, `chalk.cyan` for paths, `chalk.dim` for
  version strings.

- [ ] **Step 2: Run the existing init tests**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart && npx vitest run cli/tests/commands/everywhere/init.test.ts`
Expected: PASS — all introspection tests still pass (description + flags unchanged).

- [ ] **Step 3: Run the full test suite**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart && npx vitest run`
Expected: PASS (ignoring pre-existing auth/info failures that predate this branch).

- [ ] **Step 4: Typecheck and lint**

Run: `cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart && just check`
Expected: PASS.

- [ ] **Step 5: Rebuild so the oclif manifest registers the new command**

Run: `cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart && just build`
Expected: Completes successfully.

- [ ] **Step 6: Verify the manifest includes the init command**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart && grep -c "everywhere:init" cli/oclif.manifest.json`
Expected: non-zero count.

- [ ] **Step 7: Commit**

```bash
git add cli/src/commands/everywhere/init.ts
git commit -m "feat(cli): implement init command run logic"
```

---

### Task 4: Manual smoke test

Verify end-to-end behavior from a clean tmp directory.

**Working directory:** `/Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart`

- [ ] **Step 1: Fresh init in a clean project**

```bash
rm -rf /tmp/init-smoke
mkdir -p /tmp/init-smoke
cd /tmp/init-smoke
npm init -y > /dev/null
cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart
npx everywhere init -D /tmp/init-smoke
```

Expected output:

```
Updated package.json
Created plugin.tsx
Run `npm install` to install dependencies.
```

Verify the contents:

```bash
cat /tmp/init-smoke/package.json
cat /tmp/init-smoke/plugin.tsx
```

Expected:

- `package.json` now contains `@workday/everywhere`, `react`, `react-dom` in `dependencies`
- `plugin.tsx` contains `<h1>Welcome to init-smoke!</h1>`

- [ ] **Step 2: Re-run (should error on existing plugin.tsx)**

```bash
npx everywhere init -D /tmp/init-smoke
```

Expected: errors with `Plugin file already exists: /tmp/init-smoke/plugin.tsx. ...`. Exit code 2.

Verify `package.json` was NOT touched again by the failed run (mtime check or content inspection).
Expected: unchanged.

- [ ] **Step 3: Verbose run in a fresh dir**

```bash
rm -rf /tmp/init-smoke-v
mkdir -p /tmp/init-smoke-v
cd /tmp/init-smoke-v
npm init -y > /dev/null
cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart
npx everywhere init -D /tmp/init-smoke-v -v
```

Expected output (paths in cyan, versions dimmed, state changes in green):

```
Package: init-smoke-v@1.0.0 (/tmp/init-smoke-v/package.json)
Adding dependency: @workday/everywhere ^0.1.0
Adding dependency: react ^19
Adding dependency: react-dom ^19
Updated package.json
Writing /tmp/init-smoke-v/plugin.tsx
Created plugin.tsx
Run `npm install` to install dependencies.
```

- [ ] **Step 4: Missing package.json errors clearly**

```bash
rm -rf /tmp/init-smoke-nopkg
mkdir -p /tmp/init-smoke-nopkg
cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart
npx everywhere init -D /tmp/init-smoke-nopkg
```

Expected: errors with `No package.json found in /tmp/init-smoke-nopkg. Run \`npm init\` first.`.

- [ ] **Step 5: `package.json` without a name errors clearly**

```bash
rm -rf /tmp/init-smoke-noname
mkdir -p /tmp/init-smoke-noname
echo '{}' > /tmp/init-smoke-noname/package.json
cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart
npx everywhere init -D /tmp/init-smoke-noname
```

Expected: errors with `package.json must have a "name" field.`.

- [ ] **Step 6: Idempotent dep merge — existing dep left alone**

```bash
rm -rf /tmp/init-smoke-partial
mkdir -p /tmp/init-smoke-partial
cd /tmp/init-smoke-partial
npm init -y > /dev/null
# Pre-populate one dep at a different version to verify it's preserved
node -e "
  const fs = require('fs');
  const p = JSON.parse(fs.readFileSync('package.json','utf-8'));
  p.dependencies = { react: '^18.0.0' };
  fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
"
cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart
npx everywhere init -D /tmp/init-smoke-partial -v
```

Expected verbose output includes a line like: `Dependency already present: react (keeping ^18.0.0)`

Verify `package.json`:

```bash
cat /tmp/init-smoke-partial/package.json
```

Expected: `react` is still `^18.0.0`, `@workday/everywhere` and `react-dom` newly added.

- [ ] **Step 7: All deps already present — no package.json write**

```bash
# From the partial state above, run init again with plugin.tsx removed
rm /tmp/init-smoke-partial/plugin.tsx
cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/kickstart
npx everywhere init -D /tmp/init-smoke-partial -v
```

Expected verbose output:

```
Package: init-smoke-partial@1.0.0 (/tmp/init-smoke-partial/package.json)
Dependency already present: @workday/everywhere (keeping ^...)
Dependency already present: react (keeping ^18.0.0)
Dependency already present: react-dom (keeping ^...)
No changes to package.json
Writing /tmp/init-smoke-partial/plugin.tsx
Created plugin.tsx
Run `npm install` to install dependencies.
```

Verify `package.json` mtime did not change (no write happened).

- [ ] **Step 8: Clean up**

```bash
rm -rf /tmp/init-smoke /tmp/init-smoke-v /tmp/init-smoke-nopkg /tmp/init-smoke-noname /tmp/init-smoke-partial
```
