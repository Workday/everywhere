import { describe, it, expect } from 'vitest';
import { extractPages } from '../../src/build/extract-pages.js';

describe('extractPages()', () => {
  it('extracts pages from a bundle that exports a plugin with pages', async () => {
    const bundle = `
      const plugin = (c) => c;
      export default plugin({
        name: 'test',
        version: '1.0.0',
        pages: [{ id: 'home', title: 'Home', component: () => null }],
      });
    `;

    const pages = await extractPages(bundle);

    expect(pages).toEqual([{ id: 'home', title: 'Home' }]);
  });

  it('returns an empty array when the bundle has no pages', async () => {
    const bundle = `
      const plugin = (c) => c;
      export default plugin({ name: 'test', version: '1.0.0' });
    `;

    const pages = await extractPages(bundle);

    expect(pages).toEqual([]);
  });

  it('extracts only id and title from page objects', async () => {
    const bundle = `
      const plugin = (c) => c;
      export default plugin({
        name: 'test',
        version: '1.0.0',
        pages: [{ id: 'home', title: 'Home', component: () => null, extra: 'data' }],
      });
    `;

    const pages = await extractPages(bundle);

    expect(pages).toEqual([{ id: 'home', title: 'Home' }]);
  });

  it('handles bundles with multiple @workday/everywhere imports', async () => {
    const bundle = `
      import { plugin } from "@workday/everywhere";
      import { DataProvider } from "@workday/everywhere/data";
      export default plugin({
        name: 'test',
        version: '1.0.0',
        pages: [{ id: 'home', title: 'Home', component: () => null }],
      });
    `;

    const pages = await extractPages(bundle);

    expect(pages).toEqual([{ id: 'home', title: 'Home' }]);
  });

  it('throws when the bundle has no default export', async () => {
    const bundle = `export const foo = 'bar';`;

    await expect(extractPages(bundle)).rejects.toThrow('default export');
  });
});
