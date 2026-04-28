# Static Asset Bundling Design

## Problem

Plugins frequently need to ship static assets — stylesheets, fonts, images, icons — alongside their
JavaScript. The current SDK build pipeline does not support this:

- `cli/src/build/bundler.ts` configures esbuild with `loader: { '.css': 'empty' }`, so any `import`
  of a CSS file silently produces nothing. The directory example imports Canvas Kit tokens and a
  local `styles.css`, all of which are dropped.
- `cli/src/build/packager.ts` writes only `package.json` and `plugin.js` into the zip. There is no
  mechanism for additional files.
- The viewer has no convention for loading CSS or other assets that travel with a plugin.

The result: design-system integration is broken in practice, and every plugin author has to discover
that CSS imports are silently a no-op.

## Design

Plugins ship assets as separate files inside the package zip, served by the host as siblings of
`plugin.js` at a single base path. CSS uses a single convention file; other asset types are handled
by esbuild's standard `file` loader. The dev viewer mirrors this layout via Vite so plugin authors
write the same code in both environments.

### CSS convention

A plugin may include a single optional CSS entry point named `plugin.css`, located next to
`plugin.tsx` / `plugin.ts`. This is the only CSS the bundler processes.

Inside `plugin.css`, authors compose styles using CSS-native primitives:

```css
@import '@workday/canvas-tokens-web/css/base/_variables.css';
@import '@workday/canvas-tokens-web/css/system/_variables.css';
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

.directory-card {
  background: url('./card-bg.png');
}
```

`@import` resolves through esbuild's normal module resolution (including `node_modules`). `url(...)`
references to relative files are rewritten to hashed sibling assets inside the zip.

If `plugin.css` is absent, no CSS is emitted. The host's fetch returns 404 and is skipped; the dev
viewer's `virtual:plugin-styles` alias resolves to an empty stub. Plugins without styles pay
nothing.

JS-side `import '*.css'` is no longer silently dropped. **All** `.css` imports from JavaScript or
TypeScript files are rejected, including imports from `node_modules` (e.g.
`@workday/canvas-tokens-web/css/base/_variables.css`). The bundler produces a build error directing
the author to move them into `plugin.css` as `@import` statements. There is exactly one path for
CSS.

### Non-CSS assets

Binary asset types — `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`, `.woff`, `.woff2`, `.ttf`,
`.eot` — are handled by esbuild's `file` loader. They can be referenced from two places:

1. From `plugin.css` via `url(./foo.png)` — esbuild's CSS bundler rewrites the URL.
2. From JS/TSX via `import logo from './logo.png'` — the import resolves to a relative URL string.

In both cases, esbuild emits a hashed file under `assets/[name]-[hash].[ext]` and the import or
`url()` reference is rewritten to that path.

**Asset URL resolution.** Asset references are emitted as paths relative to the importing file (e.g.
`"./assets/logo-AB12CD.png"`), not absolute URLs. The bundler does not set esbuild's `publicPath`.
This means the browser resolves asset URLs against the URL of `plugin.js` (for JS imports) or
`plugin.css` (for CSS `url()` references). A plugin published once works at any base URL the host
chooses to serve it from, since no host-specific URL is baked into the bundle.

### Bundler changes

`cli/src/build/bundler.ts` becomes:

- Remove `loader: { '.css': 'empty' }`.
- Add asset loaders:
  ```typescript
  loader: {
    '.png': 'file', '.jpg': 'file', '.jpeg': 'file', '.gif': 'file',
    '.webp': 'file', '.svg': 'file',
    '.woff': 'file', '.woff2': 'file', '.ttf': 'file', '.eot': 'file',
  }
  ```
- Add `assetNames: 'assets/[name]-[hash]'` to control output paths.
- Run esbuild a second time on `plugin.css` if it exists, with `bundle: true`, the same loader map,
  and `assetNames: 'assets/[name]-[hash]'`. Output as a single `plugin.css`.
- Use `write: false` and collect output files in memory.
- Replace the dropped-CSS behavior with a custom esbuild plugin that intercepts `.css` resolutions
  via `onResolve({ filter: /\.css$/ })` during the JS build and throws a clear message that includes
  the original import path so the author can copy it into `plugin.css`:
  > `CSS imports from JavaScript are not supported. Move this import into plugin.css as an @import statement (e.g. @import '<original-path>';).`

`bundlePlugin`'s return type changes from `Promise<string>` to:

```typescript
interface PluginBundle {
  js: string;
  css?: string;
  assets: Array<{ path: string; contents: Uint8Array }>;
}

function bundlePlugin(cwd: string): Promise<PluginBundle>;
```

Advisory messages produced during the build (e.g. oversized assets; see "Error handling" below) are
written directly to stderr by the bundler — via `console.warn(...)` for SDK-generated advisories and
via esbuild's `logLevel: 'warning'` for esbuild's own diagnostics. Returning a `warnings` array
would force every consumer to remember to surface it, and silently dropping esbuild's own warnings
was an early oversight. Printing at the source guarantees authors see every diagnostic regardless of
which entry point invoked the bundler.

This is a breaking change to the build module's exported API. The build module is internal — it is
not re-exported from `@workday/everywhere` and has no external users. The only in-tree consumers are
the CLI commands `cli/src/commands/everywhere/{build,install,publish}.ts`, which import it directly
from the SDK's compiled `dist/build/`. Each is updated to pass the new `PluginBundle` shape through
to `packagePlugin`. No deprecation path is needed.

### Packager changes

`cli/src/build/packager.ts` accepts the new bundle shape:

```typescript
interface PackageOptions {
  pluginDir: string;
  bundle: PluginBundle;
  outputDir: string;
  slug: string;
  version: string;
}
```

The packager writes:

- `package.json` (verbatim from the plugin directory)
- `plugin.js` (from `bundle.js`)
- `plugin.css` (only if `bundle.css` is defined)
- Each entry in `bundle.assets` at its `path` (e.g., `assets/logo-AB12CD.png`)

### Host loading contract

A host that loads a packaged plugin from its zip follows this contract:

1. Attempt to fetch `plugin.css` from the plugin's base path.
2. If the response is 2xx, insert a `<link rel="stylesheet">` into the document head pointing at the
   same URL and await its `load` event. This ordering prevents flash-of-unstyled-content on first
   render.
3. If the response is non-2xx, skip CSS loading.
4. Import `plugin.js` from the plugin's base path.

Other assets (images, fonts) require no host-side handling: their URLs are relative to the plugin
base and the host's existing static file serving handles them.

This spec defines the contract only. The production Workday Everywhere host that implements it lives
outside this repository.

### Dev viewer changes

The dev viewer (`cli/src/viewer/`, launched by `everywhere view`) does not implement the fetch-and-link
contract. It is a Vite dev server that loads plugin source directly via the `virtual:plugin-entry`
alias and never consumes the zip. Vite's native CSS pipeline handles styles when they appear in the
module graph.

To wire `plugin.css` into the dev viewer's module graph without requiring authors to import it from
JS, the `everywhere view` command exposes a new `virtual:plugin-styles` alias. The dev viewer's
`main.tsx` unconditionally imports `virtual:plugin-styles`. The alias resolves to:

- `<pluginDir>/plugin.css` if that file exists, or
- An empty stub stylesheet shipped inside `dist/viewer/` if it does not.

This follows the same pattern already established by `virtual:plugin-entry` and
`virtual:plugin-package`.

The plugin author's contract is identical in both environments: place a `plugin.css` file next to
`plugin.tsx` if you want styles. The author never needs to know whether Vite or the production
host's fetch-and-link logic is doing the loading.

### Public API impact

The runtime exports of `@workday/everywhere` are unchanged. Plugin authors who previously imported
CSS from JS will see a build error with a clear message; this is intentional and the migration is
mechanical (move imports into `plugin.css` as `@import`s).

The `examples/directory` plugin is updated as part of this work to demonstrate the new convention,
serving as the canonical reference.

## Error handling

- **Missing `plugin.css`:** silent, no CSS emitted; host skips its CSS load step and dev viewer's
  styles alias resolves to an empty stub.
- **JS `import '*.css'`:** bundler error pointing to the convention.
- **`@import` or `url()` that fails to resolve:** esbuild's normal resolution error surfaces with
  file and line.
- **Asset larger than 5MB:** the bundler writes a warning to stderr via `console.warn(...)`
  identifying the asset; not an error. (Threshold chosen as a rough sanity bound for what belongs in
  a plugin bundle vs. external hosting; revisit if it proves noisy.)

## Testing

`tests/build/bundler.test.ts` covers:

- Plugin with no `plugin.css` produces a bundle with `css` undefined.
- Plugin with `plugin.css` containing `@import` of a `node_modules` stylesheet produces a single
  merged `plugin.css`.
- Plugin with `plugin.css` containing `url(./img.png)` produces a hashed asset and rewritten URL.
- Plugin with JS-side `import logo from './logo.png'` produces a hashed asset and the JS contains
  the rewritten URL string.
- Plugin with JS-side `import './styles.css'` produces a build error.
- Plugin with an asset over the size threshold writes a warning to stderr identifying the asset.

`tests/build/packager.test.ts` covers:

- Zip contains `plugin.css` when bundle includes CSS.
- Zip omits `plugin.css` when bundle has no CSS.
- Zip contains hashed asset files at their declared paths.

The directory example is converted to use `plugin.css` with `@import`s, and its build is exercised
as part of the existing examples build verification.
