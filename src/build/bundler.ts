import * as esbuild from 'esbuild';
import { join } from 'node:path';
import { access } from 'node:fs/promises';

const EXTERNAL_PACKAGES = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  '@workday/everywhere',
  '@workday/everywhere/*',
];

const PLUGIN_ENTRY_FILES = ['plugin.tsx', 'plugin.ts'];

async function findPluginEntry(cwd: string): Promise<string> {
  for (const filename of PLUGIN_ENTRY_FILES) {
    const candidate = join(cwd, filename);
    try {
      await access(candidate);
      return candidate;
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    `No plugin entry file found. Expected one of: ${PLUGIN_ENTRY_FILES.join(', ')} in ${cwd}/`
  );
}

export async function bundlePlugin(cwd: string): Promise<string> {
  const entryPath = await findPluginEntry(cwd);
  const nodePaths = [join(cwd, 'node_modules'), join(process.cwd(), 'node_modules')];

  const buildResult = await esbuild.build({
    entryPoints: [entryPath],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    jsx: 'automatic',
    jsxImportSource: 'react',
    target: 'es2020',
    minify: false,
    sourcemap: false,
    external: EXTERNAL_PACKAGES,
    nodePaths,
  });

  return buildResult.outputFiles[0]?.text ?? '';
}
