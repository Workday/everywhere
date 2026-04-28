# CLI and SDK Boundaries

This repository ships both:

- the **plugin-author SDK** (`@workday/everywhere`), and
- the **CLI implementation** (`everywhere` commands under `cli/src`).

Because both are published from one package, we keep a strict separation between what plugin authors
should depend on and what exists only to support CLI behavior.

## Plugin-author API (supported contract)

Plugin authors should import runtime APIs from:

- `@workday/everywhere`
- `@workday/everywhere/data`
- `@workday/everywhere/hooks`
- `@workday/everywhere/components` (advanced usage)

These entry points are versioned as part of the SDK public contract.

## CLI internals (not for plugin code)

The following areas are implementation details for the CLI and are not plugin-author APIs:

- `cli/src/build/**` (bundle/package pipeline used by `everywhere build|install|publish`)
- `cli/src/viewer/**` (dev viewer used by `everywhere view`)
- command internals under `cli/src/commands/**`
- host renderer internals such as `PluginRenderer` (no longer exported from SDK barrels)

These may change without preserving source-level compatibility for external consumers.

## Transitional Build API

`@workday/everywhere/build` remains available as a compatibility bridge while build internals move
to CLI-owned modules.

- Current status: **deprecated compatibility surface**
- Preferred usage: run `everywhere build`, `everywhere install`, or `everywhere publish`
- Planned direction: remove `./build` from public exports after a deprecation window in a future
  major release

## Policy for Future Changes

When deciding where new code should live:

1. If plugin code imports it directly, it belongs under `src/**` and must be treated as public API.
2. If it only supports CLI commands or packaging workflows, it belongs under `cli/src/**`.
3. Avoid filesystem-coupled imports from CLI into SDK `dist/**`; prefer CLI-local modules.
