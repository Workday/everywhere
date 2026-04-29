# Static Asset Bundling Design

## Problem

Plugins frequently need to ship static assets — stylesheets, fonts, images, icons — alongside their
JavaScript. The current SDK build pipeline does not support this:

- `src/build/bundler.ts` configures esbuild with `loader: { '.css': 'empty' }`, so any `import` of a
  CSS file silently produces nothing. The directory example imports Canvas Kit tokens and a local
  `styles.css`, all of which are dropped.
- `src/build/packager.ts` writes only `package.json` and `plugin.js` into the zip. There is no
  mechanism for additional files.
- The viewer has no convention for loading CSS or other assets that travel with a plugin.

The result: design-system integration is broken in practice, and every plugin author has to discover
that CSS imports are silently a no-op.

## Design

Plugins ship assets as separate files inside the package zip. The viewer loads them by relative URL
from the plugin's base path. CSS uses a single convention file; other asset types are handled by
esbuild's standard `file` loader.

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

If `plugin.css` is absent, no CSS is emitted and the viewer skips CSS loading entirely. Plugins
without styles pay nothing.

JS-side `import '*.css'` is no longer silently dropped. The bundler produces a build error directing
the author to use `plugin.css`. There is exactly one path for CSS.

### Non-CSS assets

Binary asset types — `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`, `.woff`, `.woff2`, `.ttf`,
`.eot` — are handled by esbuild's `file` loader. They can be referenced from two places:

1. From `plugin.css` via `url(./foo.png)` — esbuild's CSS bundler rewrites the URL.
2. From JS/TSX via `import logo from './logo.png'` — the import resolves to a relative URL string.

In both cases, esbuild emits a hashed file under `assets/[name]-[hash].[ext]` and the import or
`url()` reference is rewritten to that path. The viewer resolves these relative URLs against the
plugin's base path.

### Bundler changes

`src/build/bundler.ts` becomes:

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
  via `onResolve({ filter: /\.css$/ })` during the JS build and throws a clear message:
  > "CSS imports from JavaScript are not supported. Move CSS to `plugin.css` and use `@import`."

`bundlePlugin`'s return type changes from `Promise<string>` to:

```typescript
interface PluginBundle {
  js: string;
  css?: string;
  assets: Array<{ path: string; contents: Uint8Array }>;
}

function bundlePlugin(cwd: string): Promise<PluginBundle>;
```

This is a breaking change to the build module's exported API. The build module is internal — it is
not part of the public consumer surface of `@workday/everywhere` — so the change is made directly
without a deprecation path.

### Packager changes

`src/build/packager.ts` accepts the new bundle shape:

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

### Viewer changes

The viewer fetches `plugin.css` from the plugin's base path before importing `plugin.js`. If the
fetch returns 404 (or a non-2xx status), it is ignored — that plugin has no styles. If it succeeds,
a `<link rel="stylesheet">` is inserted into the document head pointing at the same URL, and the
viewer awaits the stylesheet's `load` event before importing the JS module. This ordering prevents
flash-of-unstyled-content when the plugin renders.

Other assets require no viewer changes: their URLs are already relative to the plugin base and the
existing static-file serving handles them.

### Public API impact

The runtime exports of `@workday/everywhere` are unchanged. Plugin authors who previously imported
CSS from JS will see a build error with a clear message; this is intentional and the migration is
mechanical (move imports into `plugin.css` as `@import`s).

The `examples/directory` plugin is updated as part of this work to demonstrate the new convention,
serving as the canonical reference.

## Error handling

- **Missing `plugin.css`:** silent, no CSS emitted, viewer skips load.
- **JS `import '*.css'`:** bundler error pointing to the convention.
- **`@import` or `url()` that fails to resolve:** esbuild's normal resolution error surfaces with
  file and line.
- **Asset larger than 5MB:** warning logged during build, not an error. (Threshold chosen as a rough
  sanity bound for what belongs in a plugin bundle vs. external hosting; revisit if it proves
  noisy.)

## Testing

`tests/build/bundler.test.ts` covers:

- Plugin with no `plugin.css` produces a bundle with `css` undefined.
- Plugin with `plugin.css` containing `@import` of a `node_modules` stylesheet produces a single
  merged `plugin.css`.
- Plugin with `plugin.css` containing `url(./img.png)` produces a hashed asset and rewritten URL.
- Plugin with JS-side `import logo from './logo.png'` produces a hashed asset and the JS contains
  the rewritten URL string.
- Plugin with JS-side `import './styles.css'` produces a build error.

`tests/build/packager.test.ts` covers:

- Zip contains `plugin.css` when bundle includes CSS.
- Zip omits `plugin.css` when bundle has no CSS.
- Zip contains hashed asset files at their declared paths.

The directory example is converted to use `plugin.css` with `@import`s, and its build is exercised
as part of the existing examples build verification.
