# Bind Command: Verbose Output and Dry-Run

## Summary

Add a shared `--verbose`/`-v` flag to `EverywhereBaseCommand` (inherited by all subcommands) and a
`--dry-run` flag to `bind`. Verbose mode prints a source/output header and a per-model field
breakdown. Dry-run is fully read-only (skips `.ts` writes and the `.config.json` update), implies
verbose, and uses a footer that makes the no-op obvious. Also exposes the previously-silent "saved
app path" persistence so users see when directory inputs mutate the plugin config.

## Motivation

`bind` today is terse (one-line summary) and all-or-nothing. Two user-visible gaps:

1. **No preview.** A user can't see what `bind` would generate without actually generating it. If
   the source zip has the wrong app, you find out after the files land.
2. **No field-level detail.** Users want to verify the parsed schema (field names, types,
   relationships) matches their expectations before committing generated code.
3. **Invisible state change.** Passing a directory path silently persists it to
   `everywhere/.config.json`. The current output gives no indication of that mutation.

This design closes all three gaps with minimal surface area.

## Design

### Flags

**`--verbose` / `-v`** — added to `EverywhereBaseCommand.baseFlags`. Inherited by every
`everywhere *` subcommand. Boolean. Each subcommand decides what to render when it's set. Only
`bind` consumes it in this PR; other subcommands can opt in later without re-designing the flag.

```typescript
verbose: Flags.boolean({
  char: 'v',
  description: 'Show detailed output.',
});
```

**`--dry-run`** — added to `BindCommand.flags` only. Boolean. No short alias (consistent with `git`,
`npm`, `cargo`). Implies `--verbose` — the effective verbose state is
`flags.verbose || flags['dry-run']`.

```typescript
'dry-run': Flags.boolean({
  description:
    'Preview what would be generated without writing any files or updating saved config. Implies --verbose.',
})
```

### Verbose output for `bind`

Printed between the load step (schemas are parsed) and the write step. Three sections.

**Header.**

```
Source: /abs/path/to/app.zip (zip)
Output: /abs/path/to/plugin/everywhere/data
```

- Source shown as the absolute path resolved by `loadRecords`, annotated `(zip)` or `(directory)`.
- Output is always the absolute `{pluginDir}/everywhere/data`.

**Per-model blocks.** One blank line between models.

```
WorkFromAnywhereRequest — "Work From Anywhere Request" (collection: workFromAnywhereRequests, 4 fields)
  id             string
  startDate      date (precision: day)
  status         string
  worker         reference → Worker
```

- Headline: `${name} — "${label}" (collection: ${collection}, ${fields.length} fields)`.
- Field lines: two-space indent, name left-padded to the longest field name _within that model_
  (each block aligns independently).
- Field type rendering:
  - Base: `type` string from the parser (e.g., `string`, `date`, `reference`)
  - If `target` is set: append ` → ${target}`
  - If `precision` is set: append ` (precision: ${precision})`
  - Both: `reference → Worker (precision: foo)`

**Footer.** Non-dry-run:

```
Generated types for 1 model(s): WorkFromAnywhereRequest
Output: /abs/path/to/plugin/everywhere/data
```

Dry-run replaces the first line:

```
Dry run — no files written. Would have generated types for 1 model(s): WorkFromAnywhereRequest
Output: /abs/path/to/plugin/everywhere/data
```

### Dry-run behavior

When `--dry-run` is set, these side effects are skipped:

1. `fs.mkdirSync(outputDir, ...)` — no directory creation
2. `fs.writeFileSync(...)` for `models.ts`, `schema.ts`, `index.ts`, and each `${schema.name}.ts`
3. `config.write({ extend: appSource })` for directory inputs

Everything else runs: argument parsing, helper-based loading (directory or zip), parsing of each
`.businessobject`, and the generator functions (producing strings in memory). This ensures dry-run
surfaces the _same_ validation errors a real bind would — malformed business objects, missing
`model/` folders, invalid zips. A dry-run that silently skipped validation would fail its purpose as
a preflight check.

### Persistence visibility

When `run()` persists `{extend: persistExtendPath}` to `everywhere/.config.json`, `bind` prints one
line regardless of verbosity:

```
Saved app path: /abs/path
```

Printed immediately after the write, before any generated output. In dry-run (where no write
happens), the equivalent line is:

```
Would save app path: /abs/path (skipped — dry run)
```

Printed in the same position (between the verbose header/body and the footer).

### Implementation structure

**`loadRecords` becomes a pure loader.** The `config.write` call that lives inside the directory
branch of `loadRecords` moves up to `run()`, so `loadRecords` only returns records. `run()`
orchestrates:

1. `loadRecords(argSource, pluginDir)` → records
2. Parse records → schemas
3. If verbose/dry-run: print header
4. If verbose/dry-run: print per-model blocks (via `formatSchemas`)
5. If `persistExtendPath` is set AND NOT dry-run: `config.write({ extend: persistExtendPath })`,
   print `Saved app path: ...`
6. If `persistExtendPath` is set AND dry-run: print `Would save app path: ... (skipped — dry run)`
7. If NOT dry-run: `mkdir` + write all output files
8. Print footer (dry-run-aware)

For step 5/6 to work, `run()` needs to know the resolved path, whether it's a zip or directory (for
the verbose header), and whether persistence should occur. The cleanest shape:

```typescript
type LoadResult = {
  records: BusinessObjectFile[];
  source: { kind: 'zip' | 'directory'; path: string };
  persistExtendPath?: string;
};
```

- `source.kind` and `source.path` are used only for the verbose header.
- `persistExtendPath` is set _iff_ the user supplied a directory arg (not a zip, not a saved-config
  fallback, not a pluginDir fallback). When present, `run()` writes to config (or reports the
  would-write in dry-run).

**Pure formatter module.** New file at `cli/src/format-schemas.ts` (top-level in cli/src — pure CLI
presentation, not codegen). Exports:

```typescript
export function formatSchemas(schemas: ModelSchema[]): string;
```

Returns the multi-model block (per-model blocks separated by blank lines). Does not include the
header or footer — those are built inline in `run()` since they depend on runtime paths.

### File changes

| File                                                  | Change                                                                                                           |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `cli/src/commands/everywhere/base.ts` (modify)        | Add `verbose` to `baseFlags`                                                                                     |
| `cli/src/commands/everywhere/bind.ts` (modify)        | Add `dry-run` flag; refactor `loadRecords` → `LoadResult`; wire verbose / dry-run output; persistence visibility |
| `cli/src/format-schemas.ts` (create)                  | Pure `formatSchemas` formatter                                                                                   |
| `cli/tests/format-schemas.test.ts` (create)           | TDD tests for formatter                                                                                          |
| `cli/tests/commands/everywhere/base.test.ts` (modify) | Assert `verbose` flag exists on `baseFlags`                                                                      |
| `cli/tests/commands/everywhere/bind.test.ts` (modify) | Assert `dry-run` flag exists                                                                                     |

### Testing

**Unit-tested (full behavior coverage):**

- `formatSchemas`:
  - Empty model list → empty string
  - Single model with one field → correct headline + one field line
  - Multiple models → blank line separator between blocks
  - Reference field → ` → ${target}` appended
  - Precision field → ` (precision: ${value})` appended
  - Alignment: multi-field model pads to the longest name within that block
  - Alignment: padding resets per block (model A's padding doesn't bleed into model B)

**Introspection-tested (matches existing project pattern):**

- `verbose` flag defined on `EverywhereBaseCommand.baseFlags`
- `dry-run` flag defined on `BindCommand.flags`

**Not unit-tested:**

- `bind.run()` end-to-end. The project does not have integration tests for command runs; the
  formatter and flag wiring are independently testable, and the existing manual smoke-test pattern
  covers the orchestration.

**Manual smoke test plan:** same setup as bind-zip-support (using apps under
`~/Projects/workday/extend/apps/`):

1. `bind` with directory arg, no `-v`: one-line `Saved app path:` + existing summary
2. `bind` with directory arg, `-v`: header + per-model blocks + `Saved app path:` + summary
3. `bind` with zip arg, `-v`: header + per-model blocks + summary (no `Saved app path:`)
4. `bind` with directory arg, `--dry-run`: header + per-model blocks +
   `Would save app path: ... (skipped — dry run)` + dry-run footer. After: `.config.json` unchanged;
   no `.ts` files in `data/`
5. `bind` with zip arg, `--dry-run`: same as 4 without the `Would save` line
6. `bind` with bad input + `--dry-run`: surfaces parser / loader errors the same as a real run

## Scope

**In scope:**

- `--verbose`/`-v` on the shared base, consumed by `bind`
- `--dry-run` on `bind`, read-only contract
- Verbose output format (header + per-model blocks + footer)
- Persistence visibility line (verbose-independent)
- `formatSchemas` helper at `cli/src/format-schemas.ts`
- `loadRecords` refactor to a pure loader returning `LoadResult`

**Out of scope:**

- `-v` consumed by other subcommands (`install`, `build`, `info`, `view`, auth). The flag is present
  for them; they opt in when they need it.
- Tiered verbosity (`-vv`, `--verbose=2`)
- Machine-readable output (`--json`)
- Relationship graph / richer schema inspection
- Separate `everywhere inspect` subcommand
- Renaming `bind` or changing its positional-vs-flag shape
- Error-message improvements beyond what dry-run already surfaces by re-using the real pipeline
