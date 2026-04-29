import JSZip from 'jszip';
import { join } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

import type { PluginBundle } from './bundler.js';

// NOTE: PackageOptions and PackageResult are mirrored in src/build/index.ts
// (the deprecated @workday/everywhere/build shim). Keep both in sync until
// that shim is removed.
export interface PackageOptions {
  pluginDir: string;
  bundle: PluginBundle;
  outputDir: string;
  slug: string;
  version: string;
}

export interface PackageResult {
  filePath: string;
  size: number;
}

export async function packagePlugin(options: PackageOptions): Promise<PackageResult> {
  const { pluginDir, bundle, outputDir, slug, version } = options;

  const pkgJson = await readFile(join(pluginDir, 'package.json'), 'utf-8');

  const zip = new JSZip();
  zip.file('package.json', pkgJson);
  zip.file('plugin.js', bundle.js);

  if (bundle.css !== undefined) {
    zip.file('plugin.css', bundle.css);
  }

  for (const { path: assetPath, contents } of bundle.assets) {
    zip.file(assetPath.split('\\').join('/'), contents);
  }

  const content = await zip.generateAsync({ type: 'uint8array' });

  await mkdir(outputDir, { recursive: true });

  const filename = `${slug}-${version}.zip`;
  const filePath = join(outputDir, filename);

  await writeFile(filePath, content);

  return { filePath, size: content.byteLength };
}
