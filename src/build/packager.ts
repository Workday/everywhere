import JSZip from 'jszip';
import { join } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

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

export async function packagePlugin(options: PackageOptions): Promise<PackageResult> {
  const { pluginDir, bundleCode, outputDir, slug, version } = options;

  const pkgJson = await readFile(join(pluginDir, 'package.json'), 'utf-8');

  const zip = new JSZip();
  zip.file('package.json', pkgJson);
  zip.file('plugin.js', bundleCode);

  const content = await zip.generateAsync({ type: 'uint8array' });

  await mkdir(outputDir, { recursive: true });

  const filename = `${slug}-${version}.zip`;
  const filePath = join(outputDir, filename);

  await writeFile(filePath, content);

  return { filePath, size: content.byteLength };
}
