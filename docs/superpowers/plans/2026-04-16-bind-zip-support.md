# Bind Command Zip Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow `everywhere bind` to accept a `.zip` archive in addition to a directory, so users
can bind from an unmodified Workday Extend export without manual extraction.

**Architecture:** Extract the inline `.businessobject` discovery logic from `bind.ts` into two
helpers — one for directory sources, one for zip archives read in-memory via `jszip`. The bind
command renames its positional arg from `app-dir` to `app-source`, detects the input type by
extension + existence check, and dispatches to the matching helper. Zip inputs are one-shot (not
persisted to `.config.json`); directory inputs continue to be persisted as today.

**Tech Stack:** TypeScript, oclif, vitest, jszip, node:fs

---

## File Structure

| File                                                                    | Responsibility                                           |
| ----------------------------------------------------------------------- | -------------------------------------------------------- |
| `cli/package.json` (modify)                                             | Add `jszip` as a direct dependency                       |
| `cli/src/commands/everywhere/business-objects.ts` (create)              | Load `.businessobject` files from a directory or zip    |
| `cli/tests/commands/everywhere/business-objects.test.ts` (create)       | Behavior tests for both loaders                          |
| `cli/src/commands/everywhere/bind.ts` (modify)                          | Rename arg, detect input type, call helpers              |
| `cli/tests/commands/everywhere/bind.test.ts` (modify)                   | Update arg test to reflect `app-source` rename           |

---

### Task 1: Add `jszip` dependency to the cli package

The cli sub-package does not currently declare `jszip` in its own `package.json`. The root package
has it, but we want the cli's dependency set to be self-describing rather than relying on hoisting
from the parent.

**Files:**

- Modify: `cli/package.json`

- [ ] **Step 1: Add jszip to dependencies**

Edit `cli/package.json`. Add `"jszip": "^3.10.1"` to the `dependencies` block so it matches the
version used in the root package:

```json
"dependencies": {
  "@oclif/core": "4.10.4",
  "chalk": "^5.6.2",
  "jiti": "^2.6.1",
  "jszip": "^3.10.1"
}
```

- [ ] **Step 2: Install**

Run: `cd /Users/jason.heddings/Projects/workday/everywhere/sdk && just setup`
Expected: Completes successfully. `cli/node_modules/jszip` now exists.

- [ ] **Step 3: Verify jszip is resolvable from the cli workspace**

Run: `ls /Users/jason.heddings/Projects/workday/everywhere/sdk/cli/node_modules/jszip/package.json`
Expected: File exists.

- [ ] **Step 4: Commit**

```bash
git add cli/package.json cli/package-lock.json
git commit -m "chore(cli): add jszip dependency"
```

---

### Task 2: Create `business-objects` module with the directory loader

Extract the inline file-discovery + read logic from `bind.ts` (lines 53-67) into a reusable helper.
This task creates the module, the type, and `loadBusinessObjects` for directory sources. The zip
loader follows in Task 3.

**Files:**

- Create: `cli/src/commands/everywhere/business-objects.ts`
- Create: `cli/tests/commands/everywhere/business-objects.test.ts`

- [ ] **Step 1: Write failing test for loading files from a directory**

In `cli/tests/commands/everywhere/business-objects.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { loadBusinessObjects } from '../../../src/commands/everywhere/business-objects.js';

describe('loadBusinessObjects', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'we-bo-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('when the model directory contains .businessobject files', () => {
    it('returns one entry per file with its contents', () => {
      const modelDir = path.join(tmpDir, 'model');
      fs.mkdirSync(modelDir);
      fs.writeFileSync(path.join(modelDir, 'Foo.businessobject'), '{"name":"Foo"}');
      fs.writeFileSync(path.join(modelDir, 'Bar.businessobject'), '{"name":"Bar"}');

      const result = loadBusinessObjects(tmpDir);

      expect(result).toEqual([
        { name: 'Foo.businessobject', content: '{"name":"Foo"}' },
        { name: 'Bar.businessobject', content: '{"name":"Bar"}' },
      ]);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/jason.heddings/Projects/workday/everywhere/sdk && npx vitest run cli/tests/commands/everywhere/business-objects.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

In `cli/src/commands/everywhere/business-objects.ts`:

```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface BusinessObjectFile {
  name: string;
  content: string;
}

export function loadBusinessObjects(appDir: string): BusinessObjectFile[] {
  const modelDir = path.join(appDir, 'model');

  if (!fs.existsSync(modelDir)) {
    throw new Error(`No model/ directory found in ${appDir}`);
  }

  const files = fs.readdirSync(modelDir).filter((f) => f.endsWith('.businessobject'));

  if (files.length === 0) {
    throw new Error(`No .businessobject files found in ${modelDir}`);
  }

  return files.map((name) => ({
    name,
    content: fs.readFileSync(path.join(modelDir, name), 'utf-8'),
  }));
}
```

Note: `readdirSync` does not guarantee alphabetical order on all platforms. If the test above fails
on ordering, sort the file list before mapping: `files.sort()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/jason.heddings/Projects/workday/everywhere/sdk && npx vitest run cli/tests/commands/everywhere/business-objects.test.ts`
Expected: PASS. If the order is platform-dependent and fails, add `files.sort()` before the `.map`
and re-run.

- [ ] **Step 5: Write failing test for missing model/ directory**

Add to `cli/tests/commands/everywhere/business-objects.test.ts`, inside the `loadBusinessObjects`
describe:

```typescript
describe('when the model directory does not exist', () => {
  it('throws an error naming the missing directory', () => {
    expect(() => loadBusinessObjects(tmpDir)).toThrow(
      `No model/ directory found in ${tmpDir}`
    );
  });
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd /Users/jason.heddings/Projects/workday/everywhere/sdk && npx vitest run cli/tests/commands/everywhere/business-objects.test.ts`
Expected: PASS (already implemented).

- [ ] **Step 7: Write failing test for empty model directory**

Add to `cli/tests/commands/everywhere/business-objects.test.ts`, inside the `loadBusinessObjects`
describe:

```typescript
describe('when the model directory has no .businessobject files', () => {
  it('throws an error naming the empty model directory', () => {
    const modelDir = path.join(tmpDir, 'model');
    fs.mkdirSync(modelDir);
    fs.writeFileSync(path.join(modelDir, 'README.md'), 'not a business object');

    expect(() => loadBusinessObjects(tmpDir)).toThrow(
      `No .businessobject files found in ${modelDir}`
    );
  });
});
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd /Users/jason.heddings/Projects/workday/everywhere/sdk && npx vitest run cli/tests/commands/everywhere/business-objects.test.ts`
Expected: PASS.

- [ ] **Step 9: Write failing test that non-.businessobject files are ignored**

Add to `cli/tests/commands/everywhere/business-objects.test.ts`, inside the `loadBusinessObjects`
describe:

```typescript
describe('when the model directory has mixed files', () => {
  it('returns only the .businessobject entries', () => {
    const modelDir = path.join(tmpDir, 'model');
    fs.mkdirSync(modelDir);
    fs.writeFileSync(path.join(modelDir, 'Foo.businessobject'), '{"name":"Foo"}');
    fs.writeFileSync(path.join(modelDir, 'README.md'), 'not a business object');

    const result = loadBusinessObjects(tmpDir);

    expect(result).toEqual([{ name: 'Foo.businessobject', content: '{"name":"Foo"}' }]);
  });
});
```

- [ ] **Step 10: Run test to verify it passes**

Run: `cd /Users/jason.heddings/Projects/workday/everywhere/sdk && npx vitest run cli/tests/commands/everywhere/business-objects.test.ts`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add cli/src/commands/everywhere/business-objects.ts cli/tests/commands/everywhere/business-objects.test.ts
git commit -m "feat(cli): add loadBusinessObjects helper for directory sources"
```

---

### Task 3: Add `loadBusinessObjectsFromZip` for zip sources

Extend the `business-objects` module with an async loader that reads `.businessobject` files from
inside a zip archive. The zip is loaded fully in memory via `jszip`.

**Files:**

- Modify: `cli/src/commands/everywhere/business-objects.ts`
- Modify: `cli/tests/commands/everywhere/business-objects.test.ts`

- [ ] **Step 1: Write failing test for loading files from a zip**

Add to `cli/tests/commands/everywhere/business-objects.test.ts`:

```typescript
import JSZip from 'jszip';
import { loadBusinessObjectsFromZip } from '../../../src/commands/everywhere/business-objects.js';

describe('loadBusinessObjectsFromZip', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'we-bo-zip-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  async function writeZip(
    zipPath: string,
    entries: Record<string, string>
  ): Promise<void> {
    const zip = new JSZip();
    for (const [name, content] of Object.entries(entries)) {
      zip.file(name, content);
    }
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(zipPath, buf);
  }

  describe('when the zip contains .businessobject files in model/', () => {
    it('returns one entry per file with its contents', async () => {
      const zipPath = path.join(tmpDir, 'app.zip');
      await writeZip(zipPath, {
        'model/Foo.businessobject': '{"name":"Foo"}',
        'model/Bar.businessobject': '{"name":"Bar"}',
      });

      const result = await loadBusinessObjectsFromZip(zipPath);

      expect(result).toEqual([
        { name: 'Foo.businessobject', content: '{"name":"Foo"}' },
        { name: 'Bar.businessobject', content: '{"name":"Bar"}' },
      ]);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/jason.heddings/Projects/workday/everywhere/sdk && npx vitest run cli/tests/commands/everywhere/business-objects.test.ts`
Expected: FAIL — `loadBusinessObjectsFromZip` does not exist.

- [ ] **Step 3: Write minimal implementation**

Add to `cli/src/commands/everywhere/business-objects.ts`:

```typescript
import JSZip from 'jszip';
import * as fsp from 'node:fs/promises';

export async function loadBusinessObjectsFromZip(
  zipPath: string
): Promise<BusinessObjectFile[]> {
  const buffer = await fsp.readFile(zipPath);
  const zip = await JSZip.loadAsync(buffer);

  const entries: BusinessObjectFile[] = [];
  let hasModelFolder = false;

  for (const [entryPath, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;

    const match = entryPath.match(/^model\/([^/]+\.businessobject)$/);
    if (!match) {
      if (entryPath.startsWith('model/')) hasModelFolder = true;
      continue;
    }

    hasModelFolder = true;
    const content = await entry.async('string');
    entries.push({ name: match[1], content });
  }

  if (!hasModelFolder) {
    throw new Error(`No model/ folder found in ${zipPath}`);
  }

  if (entries.length === 0) {
    throw new Error(`No .businessobject files found in ${zipPath}`);
  }

  return entries;
}
```

Also add the import at the top if not already present:

```typescript
import JSZip from 'jszip';
import * as fsp from 'node:fs/promises';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/jason.heddings/Projects/workday/everywhere/sdk && npx vitest run cli/tests/commands/everywhere/business-objects.test.ts`
Expected: PASS. If the order is platform-dependent and the test fails, sort `entries` by `name`
before returning.

- [ ] **Step 5: Write failing test for zip with no model/ folder**

Add to `cli/tests/commands/everywhere/business-objects.test.ts`, inside the
`loadBusinessObjectsFromZip` describe:

```typescript
describe('when the zip has no model/ folder', () => {
  it('throws an error naming the zip path', async () => {
    const zipPath = path.join(tmpDir, 'app.zip');
    await writeZip(zipPath, {
      'README.md': 'no models here',
    });

    await expect(loadBusinessObjectsFromZip(zipPath)).rejects.toThrow(
      `No model/ folder found in ${zipPath}`
    );
  });
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd /Users/jason.heddings/Projects/workday/everywhere/sdk && npx vitest run cli/tests/commands/everywhere/business-objects.test.ts`
Expected: PASS.

- [ ] **Step 7: Write failing test for zip with model/ but no .businessobject files**

Add to `cli/tests/commands/everywhere/business-objects.test.ts`, inside the
`loadBusinessObjectsFromZip` describe:

```typescript
describe('when the zip has a model/ folder but no .businessobject files', () => {
  it('throws an error naming the zip path', async () => {
    const zipPath = path.join(tmpDir, 'app.zip');
    await writeZip(zipPath, {
      'model/README.md': 'not a business object',
    });

    await expect(loadBusinessObjectsFromZip(zipPath)).rejects.toThrow(
      `No .businessobject files found in ${zipPath}`
    );
  });
});
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd /Users/jason.heddings/Projects/workday/everywhere/sdk && npx vitest run cli/tests/commands/everywhere/business-objects.test.ts`
Expected: PASS.

- [ ] **Step 9: Write failing test that non-.businessobject entries in model/ are ignored**

Add to `cli/tests/commands/everywhere/business-objects.test.ts`, inside the
`loadBusinessObjectsFromZip` describe:

```typescript
describe('when the zip has mixed files in model/', () => {
  it('returns only the .businessobject entries', async () => {
    const zipPath = path.join(tmpDir, 'app.zip');
    await writeZip(zipPath, {
      'model/Foo.businessobject': '{"name":"Foo"}',
      'model/README.md': 'not a business object',
    });

    const result = await loadBusinessObjectsFromZip(zipPath);

    expect(result).toEqual([{ name: 'Foo.businessobject', content: '{"name":"Foo"}' }]);
  });
});
```

- [ ] **Step 10: Run test to verify it passes**

Run: `cd /Users/jason.heddings/Projects/workday/everywhere/sdk && npx vitest run cli/tests/commands/everywhere/business-objects.test.ts`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add cli/src/commands/everywhere/business-objects.ts cli/tests/commands/everywhere/business-objects.test.ts
git commit -m "feat(cli): add loadBusinessObjectsFromZip helper"
```

---

### Task 4: Rewire `bind` to use helpers, rename arg, and accept zip input

Replace the inline file-discovery logic in `bind.ts` with calls to the new helpers, rename the
positional arg from `app-dir` to `app-source`, and detect whether the input is a directory or a
zip archive.

**Files:**

- Modify: `cli/src/commands/everywhere/bind.ts`
- Modify: `cli/tests/commands/everywhere/bind.test.ts`

- [ ] **Step 1: Update bind.test.ts to assert the new arg name**

Replace the `args` describe block in `cli/tests/commands/everywhere/bind.test.ts`:

```typescript
describe('args', () => {
  it('accepts an optional app-source argument', () => {
    expect(BindCommand.args['app-source']).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/jason.heddings/Projects/workday/everywhere/sdk && npx vitest run cli/tests/commands/everywhere/bind.test.ts`
Expected: FAIL — `args['app-source']` is undefined.

- [ ] **Step 3: Rewrite bind.ts to use the helpers and accept zip input**

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
} from './business-objects.js';
import { parseBusinessObject } from '../../codegen/parser.js';
import {
  generateModels,
  generateSchema,
  generateModelHooks,
  generateIndex,
} from '../../codegen/generator.js';
import { pluginConfig } from '../../config.js';

const OUTPUT_DIR = 'data';

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

    const records = await this.loadRecords(args['app-source'], pluginDir);

    // Parse all business objects
    const schemas = records.map((record) => parseBusinessObject(JSON.parse(record.content)));

    // Generate output
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

  private async loadRecords(
    argSource: string | undefined,
    pluginDir: string
  ): Promise<BusinessObjectFile[]> {
    const config = pluginConfig();

    try {
      if (argSource) {
        const appSource = path.resolve(argSource);

        if (appSource.endsWith('.zip') && fs.existsSync(appSource)) {
          return await loadBusinessObjectsFromZip(appSource);
        }

        if (fs.existsSync(appSource) && fs.statSync(appSource).isDirectory()) {
          config.write({ extend: appSource });
          return loadBusinessObjects(appSource);
        }

        this.error(`app-source must be a directory or .zip file: ${appSource}`);
      }

      const saved = config.read();
      const appDir = saved.extend ? path.resolve(pluginDir, saved.extend) : pluginDir;
      return loadBusinessObjects(appDir);
    } catch (err) {
      this.error(err instanceof Error ? err.message : String(err));
    }
  }
}
```

Key behavior:

- Arg renamed from `app-dir` to `app-source`, now `Args.string()` (was `Args.directory()`) because
  a zip path is also valid.
- Zip detection: ends with `.zip` AND file exists on disk.
- Directory inputs preserve the current behavior: resolve, persist to `.config.json`, load via
  helper.
- Zip inputs are one-shot — the saved config is neither read nor written.
- Unknown inputs (not a zip, not an existing directory) produce a clear oclif error.
- Helper-thrown errors (missing `model/`, no `.businessobject` files, unreadable zip) are caught in
  one place and re-emitted via `this.error()` so oclif formats them consistently.
- `this.error()` is typed `never`, so TypeScript sees `loadRecords` as always returning
  `BusinessObjectFile[]` on the success path.

- [ ] **Step 4: Run the bind test to verify the arg rename**

Run: `cd /Users/jason.heddings/Projects/workday/everywhere/sdk && npx vitest run cli/tests/commands/everywhere/bind.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full test suite**

Run: `cd /Users/jason.heddings/Projects/workday/everywhere/sdk && npx vitest run`
Expected: PASS (all existing tests unchanged, new tests from Tasks 2-3 pass).

- [ ] **Step 6: Typecheck and lint**

Run: `cd /Users/jason.heddings/Projects/workday/everywhere/sdk && just check`
Expected: PASS.

- [ ] **Step 7: Rebuild the cli so the oclif manifest picks up the new arg**

Run: `cd /Users/jason.heddings/Projects/workday/everywhere/sdk && just build`
Expected: Completes successfully.

- [ ] **Step 8: Verify the manifest reflects the renamed arg**

Run: `cd /Users/jason.heddings/Projects/workday/everywhere/sdk && grep -c app-source cli/oclif.manifest.json`
Expected: A non-zero count (the new arg is present). `grep -c app-dir cli/oclif.manifest.json` should be 0.

- [ ] **Step 9: Commit**

```bash
git add cli/src/commands/everywhere/bind.ts cli/tests/commands/everywhere/bind.test.ts cli/oclif.manifest.json
git commit -m "feat(cli): support .zip archives as bind input"
```

---

### Task 5: Manual smoke test

Verify end-to-end behavior against the `examples/directory` sample plugin.

- [ ] **Step 1: Confirm the directory path still works**

```bash
cd /Users/jason.heddings/Projects/workday/everywhere/sdk
npx everywhere bind examples/directory -D examples/directory
```

Expected: Generates types under `examples/directory/everywhere/data/`, log ends with
`Output: .../examples/directory/everywhere/data`. `examples/directory/everywhere/.config.json`
now includes an `extend` key pointing at `examples/directory`.

- [ ] **Step 2: Build a test zip from the example model/**

```bash
cd /Users/jason.heddings/Projects/workday/everywhere/sdk
mkdir -p /tmp/we-bind-zip
cd examples/directory
zip -r /tmp/we-bind-zip/directory-app.zip model
cd -
```

Expected: `/tmp/we-bind-zip/directory-app.zip` exists and contains `model/Department.businessobject`
and `model/Employee.businessobject`.

- [ ] **Step 3: Run bind against the zip**

```bash
cd /Users/jason.heddings/Projects/workday/everywhere/sdk
npx everywhere bind /tmp/we-bind-zip/directory-app.zip -D examples/directory
```

Expected: Same generated output as Step 1. Log ends with `Output: ...`. No errors.

- [ ] **Step 4: Verify zip input did NOT overwrite the saved config**

```bash
cat examples/directory/everywhere/.config.json
```

Expected: `extend` still points at the directory from Step 1, not the zip path.

- [ ] **Step 5: Verify a missing-source error is clear**

```bash
npx everywhere bind /tmp/does-not-exist.zip -D examples/directory
```

Expected: Errors out. Acceptable messages include the helper-thrown
`No model/ folder found in ...` (if JSZip treats the missing file as empty) or a file-not-found
error — this is a free-form smoke check, not a behavioral assertion.

- [ ] **Step 6: Verify a non-zip, non-directory input errors clearly**

```bash
touch /tmp/we-bind-zip/not-a-real-thing.txt
npx everywhere bind /tmp/we-bind-zip/not-a-real-thing.txt -D examples/directory
```

Expected: Errors out with `app-source must be a directory or .zip file: ...`.

- [ ] **Step 7: Clean up**

```bash
rm -rf /tmp/we-bind-zip
```
