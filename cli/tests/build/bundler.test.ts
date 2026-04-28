import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { bundlePlugin } from '../../src/build/index.js';

const FIXTURE_DIR = join(import.meta.dirname, 'fixtures', 'minimal-plugin');

describe('bundlePlugin()', () => {
  it('returns a non-empty string of bundled code', async () => {
    const code = await bundlePlugin(FIXTURE_DIR);

    expect(code.length).toBeGreaterThan(0);
  });

  it('produces valid ESM with a default export', async () => {
    const code = await bundlePlugin(FIXTURE_DIR);

    expect(code).toContain('export');
  });

  it('externalizes @workday/everywhere imports', async () => {
    const code = await bundlePlugin(FIXTURE_DIR);

    expect(code).toContain('@workday/everywhere');
  });

  it('externalizes react imports', async () => {
    const code = await bundlePlugin(FIXTURE_DIR);

    expect(code).toContain('react');
  });

  it('throws when no plugin entry file exists', async () => {
    const emptyDir = join(import.meta.dirname, 'fixtures');

    await expect(bundlePlugin(emptyDir)).rejects.toThrow('No plugin entry file found');
  });
});
