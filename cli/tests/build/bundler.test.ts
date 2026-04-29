import { describe, it, expect, vi } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { bundlePlugin } from '../../src/build/index.js';

const FIXTURE_DIR = join(import.meta.dirname, 'fixtures', 'minimal-plugin');
const CSS_NODE_FIXTURE = join(import.meta.dirname, 'fixtures', 'css-node-import-plugin');
const CSS_URL_FIXTURE = join(import.meta.dirname, 'fixtures', 'css-url-plugin');
const JS_PNG_FIXTURE = join(import.meta.dirname, 'fixtures', 'js-png-plugin');
const JS_IMPORTS_CSS_FIXTURE = join(import.meta.dirname, 'fixtures', 'js-imports-css-plugin');

const MINIMAL_PKG = JSON.stringify({
  name: 'big-asset-fixture',
  version: '0.0.1',
  private: true,
  dependencies: {
    '@workday/everywhere': 'file:../../../../..',
    react: '^19',
    'react-dom': '^19',
  },
});

const MINIMAL_PLUGIN_TSX = `import { plugin } from '@workday/everywhere';
import huge from './huge.png';
function HomePage() { return <img src={huge} alt="" />; }
export default plugin({ pages: [{ id: 'home', title: 'Home', component: HomePage }] });`;

describe('bundlePlugin()', () => {
  it('returns non-empty bundled JavaScript', async () => {
    const bundle = await bundlePlugin(FIXTURE_DIR);

    expect(bundle.js.length).toBeGreaterThan(0);
  });

  it('produces valid ESM with a default export', async () => {
    const bundle = await bundlePlugin(FIXTURE_DIR);

    expect(bundle.js).toContain('export');
  });

  it('externalizes @workday/everywhere imports', async () => {
    const bundle = await bundlePlugin(FIXTURE_DIR);

    expect(bundle.js).toContain('@workday/everywhere');
  });

  it('externalizes react imports', async () => {
    const bundle = await bundlePlugin(FIXTURE_DIR);

    expect(bundle.js).toContain('react');
  });

  it('throws when no plugin entry file exists', async () => {
    const emptyDir = join(import.meta.dirname, 'fixtures');

    await expect(bundlePlugin(emptyDir)).rejects.toThrow('No plugin entry file found');
  });

  describe('when the plugin has no plugin.css', () => {
    it('leaves css undefined', async () => {
      const bundle = await bundlePlugin(FIXTURE_DIR);

      expect(bundle.css).toBeUndefined();
    });
  });

  describe('when plugin.css imports from node_modules', () => {
    it('merges imported rules into the bundled css string', async () => {
      const bundle = await bundlePlugin(CSS_NODE_FIXTURE);

      expect(bundle.css).toMatch(/from-node|navy/);
    });
  });

  describe('when plugin.css references a relative image', () => {
    it('emits a hashed asset and rewrites the url in css', async () => {
      const bundle = await bundlePlugin(CSS_URL_FIXTURE);

      expect(
        bundle.assets.some((a) => /^assets\/dot-/.test(a.path) && a.path.endsWith('.png'))
      ).toBe(true);
    });

    it('includes a relative assets path in the bundled css', async () => {
      const bundle = await bundlePlugin(CSS_URL_FIXTURE);

      expect(bundle.css).toMatch(/url\(['"]?\.\/assets\/dot-/);
    });
  });

  describe('when JavaScript imports a png', () => {
    it('emits a hashed asset and rewrites the import in js', async () => {
      const bundle = await bundlePlugin(JS_PNG_FIXTURE);

      expect(bundle.js).toMatch(/\.\/assets\/dot-/);
    });
  });

  describe('when JavaScript imports a css file', () => {
    it('fails with a message that points authors to plugin.css', async () => {
      await expect(bundlePlugin(JS_IMPORTS_CSS_FIXTURE)).rejects.toThrow(/plugin\.css/);
    });

    it('fails with a message that includes an @import hint', async () => {
      await expect(bundlePlugin(JS_IMPORTS_CSS_FIXTURE)).rejects.toThrow(/@import/);
    });
  });

  describe('when an emitted asset exceeds the advisory size threshold', () => {
    it('writes a warning to stderr describing the asset', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const dir = await mkdtemp(join(tmpdir(), 'bundler-big-asset-'));
      try {
        await writeFile(join(dir, 'package.json'), MINIMAL_PKG);
        await writeFile(join(dir, 'plugin.tsx'), MINIMAL_PLUGIN_TSX);
        await writeFile(join(dir, 'huge.png'), Buffer.alloc(5 * 1024 * 1024 + 1));

        await bundlePlugin(dir);

        expect(
          warn.mock.calls.some(([msg]) => typeof msg === 'string' && /huge.*exceeds/.test(msg))
        ).toBe(true);
      } finally {
        warn.mockRestore();
        await rm(dir, { recursive: true, force: true });
      }
    });
  });
});
