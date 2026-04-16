# Bind Verbose and Dry-Run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared `--verbose`/`-v` flag inherited by all `everywhere` subcommands and a
`--dry-run` flag on `bind`. Verbose prints a source header + per-model field breakdown. Dry-run is
fully read-only, implies verbose, and makes the no-op obvious. Also surface the previously-silent
`.config.json` persistence so directory inputs announce when they update saved state.

**Architecture:** Introduce a pure `formatSchemas` helper at `cli/src/format-schemas.ts` so the
per-model rendering is independently testable. Refactor `bind.ts`'s private `loadRecords` into a
pure loader that returns a `LoadResult` carrying records plus metadata (source kind + optional
`persistExtendPath`). `run()` takes over the `config.write` decision so it can branch on dry-run
without entangling the loader.

**Tech Stack:** TypeScript, oclif, vitest, node:fs, node:path

---

## File Structure

| File                                                  | Responsibility                                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `cli/src/commands/everywhere/base.ts` (modify)        | Add `verbose` to `baseFlags`                                                              |
| `cli/tests/commands/everywhere/base.test.ts` (modify) | Assert `verbose` flag exists                                                              |
| `cli/src/codegen/parser.ts` (modify)                  | Export `ModelSchema` and `FieldSchema` types so `formatSchemas` can use them              |
| `cli/src/format-schemas.ts` (create)                  | Pure `formatSchemas` function rendering `ModelSchema[]` to human text                     |
| `cli/tests/format-schemas.test.ts` (create)           | Behavior tests for `formatSchemas`                                                        |
| `cli/src/commands/everywhere/bind.ts` (modify)        | Refactor `loadRecords` to `LoadResult`, add `--dry-run`, wire output, visible persistence |
| `cli/tests/commands/everywhere/bind.test.ts` (modify) | Assert `dry-run` flag exists                                                              |

---

### Task 1: Add `verbose` flag to the base command

Extend `EverywhereBaseCommand.baseFlags` with a shared `--verbose`/`-v` boolean. All subcommands
inherit it via the spread in their `static flags`. `bind` is the first consumer (in later tasks);
other subcommands opt in later without changing this flag.

**Files:**

- Modify: `cli/src/commands/everywhere/base.ts`
- Modify: `cli/tests/commands/everywhere/base.test.ts`

- [ ] **Step 1: Write failing test for verbose flag existence**

Add to the `baseFlags` describe block in `cli/tests/commands/everywhere/base.test.ts`:

```typescript
it('defines a verbose flag', () => {
  expect(EverywhereBaseCommand.baseFlags['verbose']).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && npx vitest run cli/tests/commands/everywhere/base.test.ts`
Expected: FAIL — `baseFlags['verbose']` is undefined.

- [ ] **Step 3: Add the verbose flag to baseFlags**

Edit `cli/src/commands/everywhere/base.ts`. Inside `static baseFlags = {...}`, add a `verbose` entry
after `plugin-dir`:

```typescript
static baseFlags = {
  'plugin-dir': Flags.directory({
    char: 'D',
    description: 'Plugin directory (defaults to current working directory).',
    exists: true,
  }),
  verbose: Flags.boolean({
    char: 'v',
    description: 'Show detailed output.',
  }),
};
```

- [ ] **Step 4: Run test to verify it passes**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && npx vitest run cli/tests/commands/everywhere/base.test.ts`
Expected: PASS.

- [ ] **Step 5: Write failing test for -v short alias**

Add to the `baseFlags` describe block in `cli/tests/commands/everywhere/base.test.ts`:

```typescript
it('uses -v as the short char for verbose', () => {
  expect(EverywhereBaseCommand.baseFlags['verbose'].char).toBe('v');
});
```

- [ ] **Step 6: Run test to verify it passes**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && npx vitest run cli/tests/commands/everywhere/base.test.ts`
Expected: PASS (already implemented).

- [ ] **Step 7: Run the full test suite to verify nothing broke**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && npx vitest run`
Expected: PASS — existing bind, install, business-objects, config tests all still pass.

- [ ] **Step 8: Commit**

```bash
git add cli/src/commands/everywhere/base.ts cli/tests/commands/everywhere/base.test.ts
git commit -m "feat(cli): add shared --verbose/-v flag on base command"
```

---

### Task 2: Export schema types and add the `formatSchemas` helper

Create a pure formatter that takes `ModelSchema[]` and returns a human-readable multi-block string
(per-model block separated by a blank line). Each block is a headline line
(`Name — "Label" (collection: ..., N fields)`) followed by the field list with field names
left-padded to the widest name in that block. Reference fields append ` → ${target}`. Fields with
precision append ` (precision: ${value})`. Both can coexist.

Before the helper can be written, `ModelSchema` and `FieldSchema` need to be exported from
`cli/src/codegen/parser.ts` — currently they're module-local.

**Files:**

- Modify: `cli/src/codegen/parser.ts`
- Create: `cli/src/format-schemas.ts`
- Create: `cli/tests/format-schemas.test.ts`

- [ ] **Step 1: Export the schema types from parser.ts**

Edit `cli/src/codegen/parser.ts`. Change the two type declarations at the top from:

```typescript
interface FieldSchema {
  name: string;
  type: string;
  target?: string;
  precision?: string;
}

interface ModelSchema {
  name: string;
  label: string;
  collection: string;
  fields: FieldSchema[];
}
```

to:

```typescript
export interface FieldSchema {
  name: string;
  type: string;
  target?: string;
  precision?: string;
}

export interface ModelSchema {
  name: string;
  label: string;
  collection: string;
  fields: FieldSchema[];
}
```

(Only the two `interface` lines change — add `export` to each.)

- [ ] **Step 2: Run all tests to verify the export is safe**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && npx vitest run`
Expected: PASS.

- [ ] **Step 3: Write failing test for empty schema list**

Create `cli/tests/format-schemas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { formatSchemas } from '../src/format-schemas.js';

describe('formatSchemas', () => {
  describe('when the schema list is empty', () => {
    it('returns an empty string', () => {
      expect(formatSchemas([])).toBe('');
    });
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && npx vitest run cli/tests/format-schemas.test.ts`
Expected: FAIL — module `../src/format-schemas.js` not found.

- [ ] **Step 5: Write minimal implementation**

Create `cli/src/format-schemas.ts`:

```typescript
import type { FieldSchema, ModelSchema } from './codegen/parser.js';

function formatFieldType(field: FieldSchema): string {
  let result = field.type;
  if (field.target) result += ` → ${field.target}`;
  if (field.precision) result += ` (precision: ${field.precision})`;
  return result;
}

function formatModel(model: ModelSchema): string {
  const maxNameLen = Math.max(0, ...model.fields.map((f) => f.name.length));
  const headline = `${model.name} — "${model.label}" (collection: ${model.collection}, ${model.fields.length} fields)`;
  const lines = model.fields.map((f) => `  ${f.name.padEnd(maxNameLen)}  ${formatFieldType(f)}`);
  return [headline, ...lines].join('\n');
}

export function formatSchemas(schemas: ModelSchema[]): string {
  return schemas.map(formatModel).join('\n\n');
}
```

- [ ] **Step 6: Run test to verify it passes**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && npx vitest run cli/tests/format-schemas.test.ts`
Expected: PASS.

- [ ] **Step 7: Write failing test for a single model with one field**

Add to `cli/tests/format-schemas.test.ts` inside the `formatSchemas` describe:

```typescript
describe('when the schema has one model with one field', () => {
  it('returns the headline and one field line', () => {
    const result = formatSchemas([
      {
        name: 'Foo',
        label: 'Foo Label',
        collection: 'foos',
        fields: [{ name: 'id', type: 'string' }],
      },
    ]);

    expect(result).toBe('Foo — "Foo Label" (collection: foos, 1 fields)\n  id  string');
  });
});
```

- [ ] **Step 8: Run test to verify it passes**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && npx vitest run cli/tests/format-schemas.test.ts`
Expected: PASS (already implemented).

- [ ] **Step 9: Write failing test for field alignment within a model**

Add inside the `formatSchemas` describe:

```typescript
describe('when a model has fields with different name lengths', () => {
  it('pads field names to the longest name within that model', () => {
    const result = formatSchemas([
      {
        name: 'Foo',
        label: 'Foo',
        collection: 'foos',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'longerName', type: 'number' },
        ],
      },
    ]);

    const lines = result.split('\n');
    expect(lines[1]).toBe('  id          string');
  });
});
```

- [ ] **Step 10: Run test to verify it passes**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && npx vitest run cli/tests/format-schemas.test.ts`
Expected: PASS.

- [ ] **Step 11: Write failing test for reference field with target**

Add inside the `formatSchemas` describe:

```typescript
describe('when a field has a target (reference)', () => {
  it('appends an arrow and the target name', () => {
    const result = formatSchemas([
      {
        name: 'Foo',
        label: 'Foo',
        collection: 'foos',
        fields: [{ name: 'owner', type: 'reference', target: 'Worker' }],
      },
    ]);

    expect(result).toContain('reference → Worker');
  });
});
```

- [ ] **Step 12: Run test to verify it passes**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && npx vitest run cli/tests/format-schemas.test.ts`
Expected: PASS.

- [ ] **Step 13: Write failing test for field with precision**

Add inside the `formatSchemas` describe:

```typescript
describe('when a field has precision', () => {
  it('appends the precision in parentheses', () => {
    const result = formatSchemas([
      {
        name: 'Foo',
        label: 'Foo',
        collection: 'foos',
        fields: [{ name: 'startDate', type: 'date', precision: 'day' }],
      },
    ]);

    expect(result).toContain('date (precision: day)');
  });
});
```

- [ ] **Step 14: Run test to verify it passes**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && npx vitest run cli/tests/format-schemas.test.ts`
Expected: PASS.

- [ ] **Step 15: Write failing test for field with both target and precision**

Add inside the `formatSchemas` describe:

```typescript
describe('when a field has both target and precision', () => {
  it('includes both in the type string', () => {
    const result = formatSchemas([
      {
        name: 'Foo',
        label: 'Foo',
        collection: 'foos',
        fields: [{ name: 'field', type: 'reference', target: 'X', precision: 'y' }],
      },
    ]);

    expect(result).toContain('reference → X (precision: y)');
  });
});
```

- [ ] **Step 16: Run test to verify it passes**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && npx vitest run cli/tests/format-schemas.test.ts`
Expected: PASS.

- [ ] **Step 17: Write failing test for multiple models separator**

Add inside the `formatSchemas` describe:

```typescript
describe('when there are multiple models', () => {
  it('separates model blocks with a blank line', () => {
    const result = formatSchemas([
      {
        name: 'Foo',
        label: 'Foo',
        collection: 'foos',
        fields: [{ name: 'id', type: 'string' }],
      },
      {
        name: 'Bar',
        label: 'Bar',
        collection: 'bars',
        fields: [{ name: 'id', type: 'string' }],
      },
    ]);

    expect(result).toContain('string\n\nBar');
  });
});
```

- [ ] **Step 18: Run test to verify it passes**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && npx vitest run cli/tests/format-schemas.test.ts`
Expected: PASS.

- [ ] **Step 19: Write failing test for independent padding across models**

Add inside the `formatSchemas` describe:

```typescript
describe('when two models have different longest field names', () => {
  it('pads each model independently', () => {
    const result = formatSchemas([
      {
        name: 'Short',
        label: 'Short',
        collection: 'shorts',
        fields: [{ name: 'id', type: 'string' }],
      },
      {
        name: 'Long',
        label: 'Long',
        collection: 'longs',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'veryLongField', type: 'string' },
        ],
      },
    ]);

    const lines = result.split('\n');
    // First model's id is padded to 2 chars (its max)
    expect(lines[1]).toBe('  id  string');
  });
});
```

- [ ] **Step 20: Run test to verify it passes**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && npx vitest run cli/tests/format-schemas.test.ts`
Expected: PASS.

- [ ] **Step 21: Write failing test for a model with no fields**

Add inside the `formatSchemas` describe:

```typescript
describe('when a model has no fields', () => {
  it('returns just the headline', () => {
    const result = formatSchemas([
      {
        name: 'Empty',
        label: 'Empty',
        collection: 'empties',
        fields: [],
      },
    ]);

    expect(result).toBe('Empty — "Empty" (collection: empties, 0 fields)');
  });
});
```

- [ ] **Step 22: Run test to verify it passes**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && npx vitest run cli/tests/format-schemas.test.ts`
Expected: PASS.

- [ ] **Step 23: Run the full test suite**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && npx vitest run`
Expected: PASS.

- [ ] **Step 24: Commit**

```bash
git add cli/src/codegen/parser.ts cli/src/format-schemas.ts cli/tests/format-schemas.test.ts
git commit -m "feat(cli): add formatSchemas helper for verbose model output"
```

---

### Task 3: Refactor `loadRecords` to return a `LoadResult`

Pure structural refactor of `bind.ts`: `loadRecords` stops calling `config.write` and instead
returns a `LoadResult` carrying the records, a small source descriptor (for the upcoming verbose
header), and an optional `persistExtendPath` (set only when the user supplied a directory arg).
`run()` takes on the persistence decision. No behavior change from the user's perspective; all
existing tests stay green.

This refactor separates "load the records" from "persist state," which is what makes the next task's
dry-run gating clean.

**Files:**

- Modify: `cli/src/commands/everywhere/bind.ts`

- [ ] **Step 1: Rewrite bind.ts with the refactored loadRecords and matching run()**

Replace the entire contents of `cli/src/commands/everywhere/bind.ts` with:

```typescript
import { Args } from '@oclif/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import EverywhereBaseCommand from './base.js';
import {
  loadBusinessObjects,
  loadBusinessObjectsFromZip,
  type BusinessObjectFile,
} from '../../codegen/business-objects.js';
import { parseBusinessObject } from '../../codegen/parser.js';
import {
  generateModels,
  generateSchema,
  generateModelHooks,
  generateIndex,
} from '../../codegen/generator.js';
import { pluginConfig } from '../../config.js';

const OUTPUT_DIR = 'data';

type LoadResult = {
  records: BusinessObjectFile[];
  source: { kind: 'zip' | 'directory'; path: string };
  persistExtendPath?: string;
};

export default class BindCommand extends EverywhereBaseCommand {
  static description =
    'Generate TypeScript types and data hooks from Workday Extend business object models.';

  static args = {
    'app-source': Args.string({
      description:
        'Path to a directory containing a model/ subfolder, or a .zip archive with the same structure. Directory paths are saved for future runs.',
      required: false,
    }),
  };

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const { args } = await this.parse(BindCommand);
    const pluginDir = await this.parsePluginDir();
    const everywhereDir = path.join(pluginDir, 'everywhere');

    const result = await this.loadRecords(args['app-source'], pluginDir);
    const schemas = result.records.map((record) => parseBusinessObject(JSON.parse(record.content)));

    if (result.persistExtendPath) {
      pluginConfig().write({ extend: result.persistExtendPath });
    }

    const outputDir = path.join(everywhereDir, OUTPUT_DIR);
    fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(path.join(outputDir, 'models.ts'), generateModels(schemas));
    fs.writeFileSync(path.join(outputDir, 'schema.ts'), generateSchema(schemas));
    fs.writeFileSync(path.join(outputDir, 'index.ts'), generateIndex(schemas));

    for (const schema of schemas) {
      fs.writeFileSync(path.join(outputDir, `${schema.name}.ts`), generateModelHooks(schema));
    }

    this.log(
      `Generated types for ${schemas.length} model(s): ${schemas.map((s) => s.name).join(', ')}`
    );
    this.log(`Output: ${outputDir}`);
  }

  private async loadRecords(argSource: string | undefined, pluginDir: string): Promise<LoadResult> {
    const config = pluginConfig();

    if (!argSource) {
      try {
        const saved = config.read();
        const appDir = saved.extend ? path.resolve(pluginDir, saved.extend) : pluginDir;
        return {
          records: loadBusinessObjects(appDir),
          source: { kind: 'directory', path: appDir },
        };
      } catch (err) {
        this.error(err instanceof Error ? err.message : String(err));
      }
    }

    const appSource = path.resolve(argSource);

    try {
      if (appSource.endsWith('.zip') && fs.existsSync(appSource)) {
        return {
          records: await loadBusinessObjectsFromZip(appSource),
          source: { kind: 'zip', path: appSource },
        };
      }

      if (fs.existsSync(appSource) && fs.statSync(appSource).isDirectory()) {
        return {
          records: loadBusinessObjects(appSource),
          source: { kind: 'directory', path: appSource },
          persistExtendPath: appSource,
        };
      }
    } catch (err) {
      this.error(err instanceof Error ? err.message : String(err));
    }

    // argSource was provided but matched neither zip nor directory
    this.error(`app-source must be a directory or .zip file: ${appSource}`);
  }
}
```

Key changes from the pre-refactor version:

- New local `LoadResult` type (not exported — internal to this module).
- `loadRecords` now returns `LoadResult` instead of bare `BusinessObjectFile[]`.
- The directory-arg branch no longer calls `config.write` — it sets `persistExtendPath` instead.
- `run()` unpacks the result, persists if `persistExtendPath` is set, and continues as before.
- The saved-config-fallback branch produces a `directory` `source` too (for the verbose header's
  benefit in later tasks); it does NOT set `persistExtendPath` because we're not re-saving.

- [ ] **Step 2: Run the full test suite to confirm no behavior regression**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && npx vitest run`
Expected: PASS.

- [ ] **Step 3: Typecheck and lint**

Run: `cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && just check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add cli/src/commands/everywhere/bind.ts
git commit -m "refactor(cli): bind loadRecords returns LoadResult with persist intent"
```

---

### Task 4: Add `--dry-run` flag, verbose output, and visible persistence

Wire up the user-facing behavior: the `--dry-run` flag on `bind`, the verbose header+body, the
dry-run-aware footer, and the one-line persistence visibility (`Saved app path: ...` or
`Would save app path: ... (skipped — dry run)`).

**Files:**

- Modify: `cli/src/commands/everywhere/bind.ts`
- Modify: `cli/tests/commands/everywhere/bind.test.ts`

- [ ] **Step 1: Write failing test for dry-run flag existence**

Add a `flags` describe block in `cli/tests/commands/everywhere/bind.test.ts`. The current file
already has `describe('flags', ...)` covering `plugin-dir`; append a new `it` inside it:

```typescript
it('defines a dry-run flag', () => {
  expect(BindCommand.flags['dry-run']).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && npx vitest run cli/tests/commands/everywhere/bind.test.ts`
Expected: FAIL — `BindCommand.flags['dry-run']` is undefined.

- [ ] **Step 3: Replace bind.ts with the final implementation**

Replace the entire contents of `cli/src/commands/everywhere/bind.ts` with:

```typescript
import { Args, Flags } from '@oclif/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import EverywhereBaseCommand from './base.js';
import {
  loadBusinessObjects,
  loadBusinessObjectsFromZip,
  type BusinessObjectFile,
} from '../../codegen/business-objects.js';
import { parseBusinessObject } from '../../codegen/parser.js';
import {
  generateModels,
  generateSchema,
  generateModelHooks,
  generateIndex,
} from '../../codegen/generator.js';
import { pluginConfig } from '../../config.js';
import { formatSchemas } from '../../format-schemas.js';

const OUTPUT_DIR = 'data';

type LoadResult = {
  records: BusinessObjectFile[];
  source: { kind: 'zip' | 'directory'; path: string };
  persistExtendPath?: string;
};

export default class BindCommand extends EverywhereBaseCommand {
  static description =
    'Generate TypeScript types and data hooks from Workday Extend business object models.';

  static args = {
    'app-source': Args.string({
      description:
        'Path to a directory containing a model/ subfolder, or a .zip archive with the same structure. Directory paths are saved for future runs.',
      required: false,
    }),
  };

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
    'dry-run': Flags.boolean({
      description:
        'Preview what would be generated without writing any files or updating saved config. Implies --verbose.',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(BindCommand);
    const pluginDir = await this.parsePluginDir();
    const everywhereDir = path.join(pluginDir, 'everywhere');
    const dryRun = flags['dry-run'];
    const verbose = flags.verbose || dryRun;

    const result = await this.loadRecords(args['app-source'], pluginDir);
    const schemas = result.records.map((record) => parseBusinessObject(JSON.parse(record.content)));
    const outputDir = path.join(everywhereDir, OUTPUT_DIR);

    if (verbose) {
      this.log(`Source: ${result.source.path} (${result.source.kind})`);
      this.log(`Output: ${outputDir}`);
      this.log('');
      this.log(formatSchemas(schemas));
      this.log('');
    }

    if (result.persistExtendPath) {
      if (dryRun) {
        this.log(`Would save app path: ${result.persistExtendPath} (skipped — dry run)`);
      } else {
        pluginConfig().write({ extend: result.persistExtendPath });
        this.log(`Saved app path: ${result.persistExtendPath}`);
      }
    }

    // Run the generators unconditionally so dry-run surfaces any generator
    // errors the same way a real bind would. Writes are guarded.
    const modelsSrc = generateModels(schemas);
    const schemaSrc = generateSchema(schemas);
    const indexSrc = generateIndex(schemas);
    const modelHooks = schemas.map((s) => ({
      name: s.name,
      src: generateModelHooks(s),
    }));

    if (!dryRun) {
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(path.join(outputDir, 'models.ts'), modelsSrc);
      fs.writeFileSync(path.join(outputDir, 'schema.ts'), schemaSrc);
      fs.writeFileSync(path.join(outputDir, 'index.ts'), indexSrc);
      for (const { name, src } of modelHooks) {
        fs.writeFileSync(path.join(outputDir, `${name}.ts`), src);
      }
    }

    const modelList = schemas.map((s) => s.name).join(', ');
    if (dryRun) {
      this.log(
        `Dry run — no files written. Would have generated types for ${schemas.length} model(s): ${modelList}`
      );
    } else {
      this.log(`Generated types for ${schemas.length} model(s): ${modelList}`);
    }
    this.log(`Output: ${outputDir}`);
  }

  private async loadRecords(argSource: string | undefined, pluginDir: string): Promise<LoadResult> {
    const config = pluginConfig();

    if (!argSource) {
      try {
        const saved = config.read();
        const appDir = saved.extend ? path.resolve(pluginDir, saved.extend) : pluginDir;
        return {
          records: loadBusinessObjects(appDir),
          source: { kind: 'directory', path: appDir },
        };
      } catch (err) {
        this.error(err instanceof Error ? err.message : String(err));
      }
    }

    const appSource = path.resolve(argSource);

    try {
      if (appSource.endsWith('.zip') && fs.existsSync(appSource)) {
        return {
          records: await loadBusinessObjectsFromZip(appSource),
          source: { kind: 'zip', path: appSource },
        };
      }

      if (fs.existsSync(appSource) && fs.statSync(appSource).isDirectory()) {
        return {
          records: loadBusinessObjects(appSource),
          source: { kind: 'directory', path: appSource },
          persistExtendPath: appSource,
        };
      }
    } catch (err) {
      this.error(err instanceof Error ? err.message : String(err));
    }

    // argSource was provided but matched neither zip nor directory
    this.error(`app-source must be a directory or .zip file: ${appSource}`);
  }
}
```

Key behavior, summarized:

- `--dry-run` sets `verbose = true` implicitly (line `const verbose = flags.verbose || dryRun`).
- Verbose block prints `Source: <path> (kind)` then `Output: <outputDir>`, then a blank line, then
  `formatSchemas(schemas)`, then a blank line.
- Persistence block runs regardless of `verbose`. It either writes + logs `Saved app path: ...`, or
  in dry-run logs `Would save app path: ... (skipped — dry run)` without touching disk.
- Write block is guarded by `if (!dryRun)`; skipping all four `.ts` writes AND the `mkdirSync`.
- Footer prints a dry-run-aware first line and the standard `Output: ...` line (the latter is always
  printed, matching the spec — slight redundancy with verbose header is intentional).

- [ ] **Step 4: Run the bind test to verify the dry-run flag is now defined**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && npx vitest run cli/tests/commands/everywhere/bind.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full test suite**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && npx vitest run`
Expected: PASS.

- [ ] **Step 6: Typecheck and lint**

Run: `cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && just check`
Expected: PASS.

- [ ] **Step 7: Rebuild so the oclif manifest picks up the new flag**

Run: `cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && just build`
Expected: Completes successfully.

- [ ] **Step 8: Verify the manifest reflects the new flag**

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && grep -c "dry-run" cli/oclif.manifest.json`
Expected: non-zero count.

Run:
`cd /Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness && grep -c "verbose" cli/oclif.manifest.json`
Expected: non-zero count (at minimum, present on every command that inherits baseFlags).

- [ ] **Step 9: Commit**

```bash
git add cli/src/commands/everywhere/bind.ts cli/tests/commands/everywhere/bind.test.ts
git commit -m "feat(cli): add --dry-run and verbose output to bind"
```

---

### Task 5: Manual smoke test

Verify end-to-end behavior against the real Workday Extend apps under
`~/Projects/workday/extend/apps/`.

**Working directory:** `/Users/jason.heddings/Projects/workday/everywhere/sdk/.worktrees/chattiness`

- [ ] **Step 1: Reset the example plugin state**

```bash
rm -rf examples/directory/everywhere/.config.json examples/directory/everywhere/data
```

- [ ] **Step 2: Directory input, non-verbose**

```bash
npx everywhere bind ~/Projects/workday/extend/apps/we4t_pgbbrx -D examples/directory
```

Expected output:

```
Saved app path: /Users/jason.heddings/Projects/workday/extend/apps/we4t_pgbbrx
Generated types for 1 model(s): DemoObj
Output: .../examples/directory/everywhere/data
```

Verify:

```bash
cat examples/directory/everywhere/.config.json
```

Expected: `{ "extend": "/Users/jason.heddings/Projects/workday/extend/apps/we4t_pgbbrx" }`

- [ ] **Step 3: Directory input, verbose**

```bash
rm -rf examples/directory/everywhere/.config.json examples/directory/everywhere/data
npx everywhere bind ~/Projects/workday/extend/apps/we4t_pgbbrx -D examples/directory -v
```

Expected output (approximate — exact field ordering depends on parser):

```
Source: /Users/.../we4t_pgbbrx (directory)
Output: .../examples/directory/everywhere/data

DemoObj — "Demo Object" (collection: demoObjects, N fields)
  <field1>  <type1>
  ...

Saved app path: /Users/.../we4t_pgbbrx
Generated types for 1 model(s): DemoObj
Output: .../examples/directory/everywhere/data
```

- [ ] **Step 4: Zip input, verbose**

```bash
rm -rf examples/directory/everywhere/.config.json examples/directory/everywhere/data
npx everywhere bind ~/Projects/workday/extend/apps/wfaa_K7mQ2xPw_ycjtxv.zip -D examples/directory -v
```

Expected:

- `Source: /Users/.../wfaa_K7mQ2xPw_ycjtxv.zip (zip)` header
- Per-model block(s)
- No `Saved app path:` line (zip is one-shot)
- `Generated types for ...` footer
- `.config.json` is NOT created

Verify no config written:

```bash
ls examples/directory/everywhere/.config.json 2>&1 || echo "no config — correct"
```

- [ ] **Step 5: Directory input, dry-run**

```bash
rm -rf examples/directory/everywhere/.config.json examples/directory/everywhere/data
npx everywhere bind ~/Projects/workday/extend/apps/we4t_pgbbrx -D examples/directory --dry-run
```

Expected output:

- `Source: /Users/.../we4t_pgbbrx (directory)` header
- Per-model block
- `Would save app path: /Users/.../we4t_pgbbrx (skipped — dry run)` line
- Footer: `Dry run — no files written. Would have generated types for 1 model(s): DemoObj`
- `Output: .../examples/directory/everywhere/data`

Verify nothing landed:

```bash
ls examples/directory/everywhere/
```

Expected: the directory is empty (no `.config.json`, no `data/`).

- [ ] **Step 6: Zip input, dry-run**

```bash
npx everywhere bind ~/Projects/workday/extend/apps/wfaa_K7mQ2xPw_ycjtxv.zip -D examples/directory --dry-run
```

Expected:

- Verbose header (zip)
- Per-model block
- NO `Would save app path:` line (zip never persists)
- Dry-run footer
- Nothing written

- [ ] **Step 7: Dry-run surfaces errors from a bad source**

```bash
npx everywhere bind /tmp/does-not-exist.zip -D examples/directory --dry-run
```

Expected: errors out with `app-source must be a directory or .zip file: /tmp/does-not-exist.zip`
(same behavior as without `--dry-run`).

- [ ] **Step 8: Clean up**

```bash
git checkout -- examples/directory/
```
