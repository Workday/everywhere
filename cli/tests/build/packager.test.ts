import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import JSZip from 'jszip';
import { packagePlugin } from '../../src/build/index.js';

let tempDir: string;
let pluginDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'packager-test-'));
  pluginDir = join(tempDir, 'plugin');
  await mkdir(pluginDir);
  await writeFile(
    join(pluginDir, 'package.json'),
    JSON.stringify({ name: 'test-plugin', version: '1.0.0' })
  );
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('packagePlugin()', () => {
  it('creates a zip file at the expected path', async () => {
    const outputDir = join(tempDir, 'dist');
    const result = await packagePlugin({
      pluginDir,
      bundleCode: 'export default {};',
      outputDir,
      slug: 'test-plugin',
      version: '1.0.0',
    });

    expect(result.filePath).toBe(join(outputDir, 'test-plugin-1.0.0.zip'));
  });

  it('includes package.json in the zip', async () => {
    const outputDir = join(tempDir, 'dist');
    const result = await packagePlugin({
      pluginDir,
      bundleCode: 'export default {};',
      outputDir,
      slug: 'test-plugin',
      version: '1.0.0',
    });

    const zipData = await readFile(result.filePath);
    const zip = await JSZip.loadAsync(zipData);

    expect(zip.file('package.json')).not.toBeNull();
  });

  it('includes plugin.js in the zip', async () => {
    const outputDir = join(tempDir, 'dist');
    const result = await packagePlugin({
      pluginDir,
      bundleCode: 'export default {};',
      outputDir,
      slug: 'test-plugin',
      version: '1.0.0',
    });

    const zipData = await readFile(result.filePath);
    const zip = await JSZip.loadAsync(zipData);

    expect(zip.file('plugin.js')).not.toBeNull();
  });

  it('returns the file size in bytes', async () => {
    const outputDir = join(tempDir, 'dist');
    const result = await packagePlugin({
      pluginDir,
      bundleCode: 'export default {};',
      outputDir,
      slug: 'test-plugin',
      version: '1.0.0',
    });

    expect(result.size).toBeGreaterThan(0);
  });

  it('creates the output directory if it does not exist', async () => {
    const nestedDir = join(tempDir, 'nested', 'output');
    const result = await packagePlugin({
      pluginDir,
      bundleCode: 'export default {};',
      outputDir: nestedDir,
      slug: 'test-plugin',
      version: '1.0.0',
    });

    expect(result.size).toBeGreaterThan(0);
  });
});
