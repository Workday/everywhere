// Deprecated compatibility surface for `@workday/everywhere/build`.
//
// The canonical implementations live in `cli/src/build/**`. This file proxies
// the async entry points through a runtime dynamic import and re-implements
// the synchronous `slugify` inline (see note below). Anything exported from
// here must remain source-compatible with `cli/src/build/**` until the
// deprecation window closes.

// NOTE: PackageOptions and PackageResult mirror the canonical declarations in
// cli/src/build/packager.ts. Keep these in sync until this shim is removed.
export interface PackageOptions {
  pluginDir: string;
  bundleCode: string;
  outputDir: string;
  slug: string;
  version: string;
}

export interface PackageResult {
  filePath: string;
  size: number;
}

interface CliBuildModule {
  bundlePlugin(cwd: string): Promise<string>;
  packagePlugin(options: PackageOptions): Promise<PackageResult>;
}

const CLI_BUILD_SPECIFIER = '../../cli/dist/build/index.js';
const DEPRECATION_WARNING =
  '@workday/everywhere/build is deprecated and will be removed in a future major release. Use the everywhere CLI commands (build, install, publish) instead.';

let warned = false;

function warnDeprecated(): void {
  if (warned) return;
  warned = true;
  console.warn(DEPRECATION_WARNING);
}

async function loadCliBuildModule(): Promise<CliBuildModule> {
  try {
    return (await import(CLI_BUILD_SPECIFIER)) as CliBuildModule;
  } catch (cause) {
    const error = new Error(
      `Failed to load @workday/everywhere/build internals from "${CLI_BUILD_SPECIFIER}". ` +
        `This export is deprecated; use the everywhere CLI commands (build, install, publish) instead.`
    );
    (error as { cause?: unknown }).cause = cause;
    throw error;
  }
}

export async function bundlePlugin(cwd: string): Promise<string> {
  warnDeprecated();
  const cliBuild = await loadCliBuildModule();
  return cliBuild.bundlePlugin(cwd);
}

export async function packagePlugin(options: PackageOptions): Promise<PackageResult> {
  warnDeprecated();
  const cliBuild = await loadCliBuildModule();
  return cliBuild.packagePlugin(options);
}

// NOTE: This implementation must mirror cli/src/build/slug.ts exactly. It is
// duplicated here because the shim's other exports are async (proxied via
// dynamic import) but `slugify` has always been synchronous, and changing
// that would itself be a breaking change.
export function slugify(input: string): string {
  warnDeprecated();
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
