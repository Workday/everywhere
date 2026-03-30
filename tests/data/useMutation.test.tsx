import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DataProvider } from '../../src/data/DataContext.js';
import { useMutation } from '../../src/data/useMutation.js';
import type { DataResolver } from '../../src/data/resolver.js';

function createMockResolver(overrides: Partial<DataResolver> = {}): DataResolver {
  return {
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    remove: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function MutationConsumer({ model }: { model: string }) {
  const { create, update, remove } = useMutation(model);
  return (
    <div>
      {typeof create === 'function' ? 'has-create' : 'no-create'}
      {typeof update === 'function' ? 'has-update' : 'no-update'}
      {typeof remove === 'function' ? 'has-remove' : 'no-remove'}
    </div>
  );
}

describe('useMutation()', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns create, update, and remove functions', () => {
    const resolver = createMockResolver();

    const html = renderToStaticMarkup(
      <DataProvider resolver={resolver}>
        <MutationConsumer model="Employee" />
      </DataProvider>
    );

    expect(html).toContain('has-create');
  });

  it('returns update function', () => {
    const resolver = createMockResolver();

    const html = renderToStaticMarkup(
      <DataProvider resolver={resolver}>
        <MutationConsumer model="Employee" />
      </DataProvider>
    );

    expect(html).toContain('has-update');
  });

  it('returns remove function', () => {
    const resolver = createMockResolver();

    const html = renderToStaticMarkup(
      <DataProvider resolver={resolver}>
        <MutationConsumer model="Employee" />
      </DataProvider>
    );

    expect(html).toContain('has-remove');
  });
});
