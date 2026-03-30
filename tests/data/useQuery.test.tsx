import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DataProvider } from '../../src/data/DataContext.js';
import { useQuery } from '../../src/data/useQuery.js';
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

function QueryConsumer({ model, options }: { model: string; options?: { id?: string } }) {
  const { data, loading, error, refetch } = useQuery(model, options);
  return (
    <div>
      <span data-loading={loading} />
      <span data-has-refetch={typeof refetch === 'function'} />
      <span data-has-data={data !== undefined} />
      <span data-has-error={error !== undefined} />
    </div>
  );
}

describe('useQuery()', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns loading as true on initial render', () => {
    const resolver = createMockResolver();

    const html = renderToStaticMarkup(
      <DataProvider resolver={resolver}>
        <QueryConsumer model="Employee" />
      </DataProvider>
    );

    expect(html).toContain('data-loading="true"');
  });

  it('returns a refetch function', () => {
    const resolver = createMockResolver();

    const html = renderToStaticMarkup(
      <DataProvider resolver={resolver}>
        <QueryConsumer model="Employee" />
      </DataProvider>
    );

    expect(html).toContain('data-has-refetch="true"');
  });

  it('initializes data as null', () => {
    const resolver = createMockResolver();

    const html = renderToStaticMarkup(
      <DataProvider resolver={resolver}>
        <QueryConsumer model="Employee" />
      </DataProvider>
    );

    expect(html).toContain('data-has-data="true"');
  });

  it('initializes error as null', () => {
    const resolver = createMockResolver();

    const html = renderToStaticMarkup(
      <DataProvider resolver={resolver}>
        <QueryConsumer model="Employee" />
      </DataProvider>
    );

    expect(html).toContain('data-has-error="true"');
  });

  describe('without a DataProvider', () => {
    it('throws an error', () => {
      expect(() => {
        renderToStaticMarkup(<QueryConsumer model="Employee" />);
      }).toThrow('useDataContext must be used within a DataProvider');
    });
  });
});
