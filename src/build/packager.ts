import JSZip from 'jszip';
import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import type { Manifest } from './manifest.js';

export interface PackageOptions {
  manifest: Manifest;
  bundleCode: string;
  outputDir: string;
  slug: string;
}

export interface PackageResult {
  filePath: string;
  size: number;
}

export async function packagePlugin(options: PackageOptions): Promise<PackageResult> {
  const { manifest, bundleCode, outputDir, slug } = options;

  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('plugin.js', bundleCode);

  const content = await zip.generateAsync({ type: 'uint8array' });

  await mkdir(outputDir, { recursive: true });

  const filename = `${slug}-${manifest.version}.zip`;
  const filePath = join(outputDir, filename);

  await writeFile(filePath, content);

  return { filePath, size: content.byteLength };
}
