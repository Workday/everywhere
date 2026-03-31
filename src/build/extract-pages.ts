import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeFile, unlink } from 'node:fs/promises';

function stubExternalImports(code: string): string {
  const sdkPattern = /import\s*\{[^}]*\}\s*from\s*["']@workday\/everywhere(?:\/[^"']*)?\s*["'];?/g;

  // Only the first SDK import gets the plugin stub; subsequent ones become
  // empty strings so we don't redeclare `const plugin` in strict mode.
  let stubbed = false;
  return code
    .replace(sdkPattern, () => {
      if (!stubbed) {
        stubbed = true;
        return 'const plugin = (c) => c;';
      }
      return '';
    })
    .replace(/import\s*\{[^}]*\}\s*from\s*["']react(?:\/[^"']*)?\s*["'];?/g, '')
    .replace(/import\s*\{[^}]*\}\s*from\s*["']react-dom(?:\/[^"']*)?\s*["'];?/g, '');
}

const BROWSER_GLOBALS: Record<string, unknown> = {
  window: globalThis,
  navigator: { userAgent: '' },
};

function makeDomProxy(): unknown {
  const domProxy: unknown = new Proxy(function () {}, {
    get: (_target, prop) => {
      if (prop === Symbol.toPrimitive) return () => '';
      if (prop === 'style') return {};
      if (prop === 'classList')
        return { add() {}, remove() {}, toggle() {}, contains: () => false };
      if (prop === 'sheet') return { insertRule: () => 0, deleteRule() {}, cssRules: [] };
      if (prop === 'querySelectorAll') return () => [];
      if (prop === 'querySelector') return () => null;
      return domProxy;
    },
    apply: () => domProxy,
    construct: () => domProxy as object,
  });
  return domProxy;
}

function polyfillBrowserGlobals(): () => void {
  const domProxy = makeDomProxy();
  const installed: string[] = [];
  const g = globalThis as Record<string, unknown>;

  const polyfills: Record<string, unknown> = {
    document: domProxy,
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    HTMLElement: class HTMLElement {},
    ...BROWSER_GLOBALS,
  };

  for (const [key, value] of Object.entries(polyfills)) {
    if (typeof g[key] === 'undefined') {
      g[key] = value;
      installed.push(key);
    }
  }

  return () => {
    for (const key of installed) {
      g[key] = undefined;
    }
  };
}

export async function extractPages(
  bundleCode: string
): Promise<Array<{ id: string; title: string }>> {
  const tempFile = join(
    tmpdir(),
    `plugin-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`
  );
  const cleanup = polyfillBrowserGlobals();

  try {
    await writeFile(tempFile, stubExternalImports(bundleCode));
    const fileUrl = new URL(`file://${tempFile}`).href;
    const mod = await import(fileUrl);
    const def = mod.default;

    if (!def) {
      throw new Error('Plugin bundle must have a default export from plugin().');
    }

    if (!Array.isArray(def.pages)) {
      return [];
    }

    return def.pages.map((p: { id: string; title: string }) => ({
      id: p.id,
      title: p.title,
    }));
  } finally {
    cleanup();
    await unlink(tempFile).catch(() => {});
  }
}
