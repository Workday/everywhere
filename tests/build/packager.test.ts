import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import JSZip from 'jszip';
import { packagePlugin } from '../../src/build/packager.js';
import type { Manifest } from '../../src/build/manifest.js';

const manifest: Manifest = {
  name: 'test-plugin',
  version: '1.0.0',
  pages: [{ id: 'home', title: 'Home' }],
};

const bundleCode = 'export default {};';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'packager-test-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('packagePlugin()', () => {
  it('creates a zip file at the expected path', async () => {
    const result = await packagePlugin({
      manifest,
      bundleCode,
      outputDir: tempDir,
      slug: 'test-plugin',
    });

    expect(result.filePath).toBe(join(tempDir, 'test-plugin-1.0.0.zip'));
  });

  it('includes manifest.json in the zip', async () => {
    const result = await packagePlugin({
      manifest,
      bundleCode,
      outputDir: tempDir,
      slug: 'test-plugin',
    });

    const zipData = await readFile(result.filePath);
    const zip = await JSZip.loadAsync(zipData);

    expect(zip.file('manifest.json')).not.toBeNull();
  });

  it('includes plugin.js in the zip', async () => {
    const result = await packagePlugin({
      manifest,
      bundleCode,
      outputDir: tempDir,
      slug: 'test-plugin',
    });

    const zipData = await readFile(result.filePath);
    const zip = await JSZip.loadAsync(zipData);

    expect(zip.file('plugin.js')).not.toBeNull();
  });

  it('returns the file size in bytes', async () => {
    const result = await packagePlugin({
      manifest,
      bundleCode,
      outputDir: tempDir,
      slug: 'test-plugin',
    });

    expect(result.size).toBeGreaterThan(0);
  });

  it('creates the output directory if it does not exist', async () => {
    const nestedDir = join(tempDir, 'nested', 'output');
    const result = await packagePlugin({
      manifest,
      bundleCode,
      outputDir: nestedDir,
      slug: 'test-plugin',
    });

    expect(result.size).toBeGreaterThan(0);
  });
});
