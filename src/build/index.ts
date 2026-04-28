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
  '@workday/everywhere/build is deprecated and will be removed in a future major release. Use everywhere CLI commands instead.';

let warned = false;

function warnDeprecated(): void {
  if (warned) return;
  warned = true;
  console.warn(DEPRECATION_WARNING);
}

async function loadCliBuildModule(): Promise<CliBuildModule> {
  return (await import(CLI_BUILD_SPECIFIER)) as CliBuildModule;
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

export function slugify(input: string): string {
  warnDeprecated();
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
