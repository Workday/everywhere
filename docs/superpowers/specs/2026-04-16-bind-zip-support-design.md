# Bind Command: Zip File Support

## Summary

Add support for zip file inputs to the `everywhere bind` command. Currently, `bind` accepts a
directory path containing a `model/` subfolder with `.businessobject` files. This change allows
users to provide a `.zip` file with the same internal structure as an alternative to a directory.

## Motivation

Users may receive Workday Extend app definitions as zip archives rather than extracted directories.
Supporting zip files directly avoids requiring users to manually extract before running `bind`.

## Design

### Argument Change

The `app-dir` argument is renamed to `app-source`. Its type changes from `Args.directory()` to
`Args.string()` to accept both directory paths and zip file paths. Validation is handled manually in
the command logic.

### Detection Logic

The bind command determines the input type:

- If `app-source` ends with `.zip` and the file exists: treat as a zip archive
- If `app-source` is an existing directory: treat as a directory (current behavior)
- Otherwise: error

### Zip Handling

Zip files are read entirely in-memory using `jszip` (already a project dependency). The command
looks for entries matching `model/*.businessobject` inside the zip. No files are extracted to disk.

Zip inputs are one-shot -- they are **not** saved to the plugin config for future runs. Only
directory paths are persisted (existing behavior).

### Helper Functions

The inline file discovery + reading logic (currently lines 53-67 of bind.ts) is extracted into two
helper functions:

- `loadBusinessObjects(appDir: string): Array<{ name: string; content: string }>` -- reads
  `.businessobject` files from a `model/` subdirectory on disk
- `loadBusinessObjectsFromZip(zipPath: string): Promise<Array<{ name: string; content: string }>>`
  -- reads `.businessobject` files from `model/` inside a zip archive using jszip

Both return the same shape, feeding into the existing parse/generate pipeline unchanged.

### Error Handling

- Missing `model/` directory in a directory input: `No model/ directory found in {path}`
- Missing `model/` folder in a zip input: `No model/ folder found in {zipPath}`
- No `.businessobject` files in either case: `No .businessobject files found in {path}`
- Invalid or unreadable zip: let jszip's error propagate

### Generated Output

No changes. The output directory, file generation, and codegen pipeline remain identical regardless
of input source.

## Scope

- **In scope:** zip file detection, in-memory zip reading, helper extraction, argument rename, tests
  for new behavior
- **Out of scope:** recursive zip traversal, nested zips, password-protected zips, config
  persistence for zip inputs
