import * as esbuild from 'esbuild';
import { extname, join, relative, resolve } from 'node:path';
import { access } from 'node:fs/promises';

const EXTERNAL_PACKAGES = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  '@workday/everywhere',
  '@workday/everywhere/*',
];

const PLUGIN_ENTRY_FILES = ['plugin.tsx', 'plugin.ts'];

const FILE_LOADERS: Record<string, esbuild.Loader> = {
  '.png': 'file',
  '.jpg': 'file',
  '.jpeg': 'file',
  '.gif': 'file',
  '.webp': 'file',
  '.svg': 'file',
  '.woff': 'file',
  '.woff2': 'file',
  '.ttf': 'file',
  '.eot': 'file',
};

const ASSET_NAMES = 'assets/[name]-[hash]';
const ASSET_SIZE_WARN_BYTES = 5 * 1024 * 1024;

export interface PluginBundle {
  js: string;
  css?: string;
  assets: Array<{ path: string; contents: Uint8Array }>;
  warnings: string[];
}

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

async function findPluginCssPath(cwd: string): Promise<string | undefined> {
  const candidate = join(cwd, 'plugin.css');
  try {
    await access(candidate);
    return candidate;
  } catch {
    return undefined;
  }
}

function normalizeOutPath(outPath: string): string {
  return outPath.split('\\').join('/');
}

function outputRelativeToOutdir(outdir: string, filePath: string): string {
  const rel = relative(resolve(outdir), resolve(filePath));
  return normalizeOutPath(rel);
}

function rejectCssImportsFromJs(): esbuild.Plugin {
  return {
    name: 'reject-css-from-js',
    setup(build) {
      build.onResolve({ filter: /\.css$/ }, (args) => {
        if (args.importer && extname(args.importer) === '.css') {
          return undefined;
        }
        const safePath = args.path.replace(/'/g, "\\'");
        return {
          errors: [
            {
              text: `CSS imports from JavaScript are not supported. Move this import into plugin.css as an @import statement (e.g. @import '${safePath}';).`,
            },
          ],
        };
      });
    },
  };
}

function splitBuildOutputs(
  outputFiles: esbuild.OutputFile[],
  outdir: string
): { js: string; css?: string; assets: Array<{ path: string; contents: Uint8Array }> } {
  let js = '';
  let css: string | undefined;
  const assets: Array<{ path: string; contents: Uint8Array }> = [];

  for (const file of outputFiles) {
    const rel = outputRelativeToOutdir(outdir, file.path);
    if (rel.endsWith('.js')) {
      js = file.text;
    } else if (rel.endsWith('.css')) {
      css = file.text;
    } else {
      assets.push({ path: rel, contents: file.contents });
    }
  }

  return { js, css, assets };
}

function collectAssetSizeWarnings(assets: Array<{ path: string; contents: Uint8Array }>): string[] {
  const warnings: string[] = [];
  for (const { path: assetPath, contents } of assets) {
    if (contents.byteLength > ASSET_SIZE_WARN_BYTES) {
      warnings.push(
        `Asset "${assetPath}" is ${contents.byteLength} bytes (exceeds ${ASSET_SIZE_WARN_BYTES} byte advisory threshold).`
      );
    }
  }
  return warnings;
}

function sharedBuildOptions(outdir: string, nodePaths: string[]): esbuild.BuildOptions {
  return {
    bundle: true,
    write: false,
    outdir,
    format: 'esm',
    platform: 'browser',
    jsx: 'automatic',
    jsxImportSource: 'react',
    target: 'es2020',
    minify: false,
    sourcemap: false,
    external: EXTERNAL_PACKAGES,
    loader: FILE_LOADERS,
    assetNames: ASSET_NAMES,
    nodePaths,
  };
}

export async function bundlePlugin(cwd: string): Promise<PluginBundle> {
  const entryPath = await findPluginEntry(cwd);
  const nodePaths = [join(cwd, 'node_modules'), join(process.cwd(), 'node_modules')];
  const outdir = join(cwd, '.everywhere-esbuild-out');

  const jsResult = await esbuild.build({
    ...sharedBuildOptions(outdir, nodePaths),
    entryPoints: [entryPath],
    plugins: [rejectCssImportsFromJs()],
  });

  const { js, assets: jsAssets } = splitBuildOutputs(jsResult.outputFiles ?? [], outdir);

  const cssEntry = await findPluginCssPath(cwd);
  let css: string | undefined;
  const cssAssets: Array<{ path: string; contents: Uint8Array }> = [];

  if (cssEntry) {
    const cssResult = await esbuild.build({
      ...sharedBuildOptions(outdir, nodePaths),
      entryPoints: [cssEntry],
    });
    const split = splitBuildOutputs(cssResult.outputFiles ?? [], outdir);
    css = split.css;
    cssAssets.push(...split.assets);
  }

  const assets = [...jsAssets, ...cssAssets];
  const warnings = collectAssetSizeWarnings(assets);

  return { js, css, assets, warnings };
}
