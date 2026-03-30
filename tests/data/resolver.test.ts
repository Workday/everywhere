import { describe, it, expect, vi } from 'vitest';
import { HttpResolver } from '../../src/data/HttpResolver.js';

describe('HttpResolver', () => {
  describe('find()', () => {
    it('posts a find query to the graphql endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: '1', name: 'Alice' }] }),
      });
      globalThis.fetch = mockFetch;

      const resolver = new HttpResolver('/api/data');
      await resolver.find('Employee');

      expect(mockFetch).toHaveBeenCalledWith('/api/data/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'find', variables: { type: 'Employee' } }),
      });
    });

    it('returns the data array from the response', async () => {
      const records = [{ id: '1', name: 'Alice' }];
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: records }),
      });

      const resolver = new HttpResolver('/api/data');
      const result = await resolver.find('Employee');

      expect(result).toEqual(records);
    });

    it('includes filter in variables when provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });
      globalThis.fetch = mockFetch;

      const resolver = new HttpResolver('/api/data');
      await resolver.find('Employee', { department: 'Engineering' });

      expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
        query: 'find',
        variables: { type: 'Employee', filter: { department: 'Engineering' } },
      });
    });
  });

  describe('findOne()', () => {
    it('posts a findOne query with the id', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { id: '1', name: 'Alice' } }),
      });
      globalThis.fetch = mockFetch;

      const resolver = new HttpResolver('/api/data');
      await resolver.findOne('Employee', '1');

      expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
        query: 'findOne',
        variables: { type: 'Employee', id: '1' },
      });
    });

    it('returns the single record', async () => {
      const record = { id: '1', name: 'Alice' };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: record }),
      });

      const resolver = new HttpResolver('/api/data');
      const result = await resolver.findOne('Employee', '1');

      expect(result).toEqual(record);
    });
  });

  describe('create()', () => {
    it('posts a create mutation', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { id: '2', name: 'Bob' } }),
      });
      globalThis.fetch = mockFetch;

      const resolver = new HttpResolver('/api/data');
      await resolver.create('Employee', { name: 'Bob' });

      expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
        query: 'create',
        variables: { type: 'Employee', data: { name: 'Bob' } },
      });
    });

    it('returns the created record', async () => {
      const created = { id: '2', name: 'Bob' };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: created }),
      });

      const resolver = new HttpResolver('/api/data');
      const result = await resolver.create('Employee', { name: 'Bob' });

      expect(result).toEqual(created);
    });
  });

  describe('update()', () => {
    it('posts an update mutation', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { id: '1', name: 'Alice Updated' } }),
      });
      globalThis.fetch = mockFetch;

      const resolver = new HttpResolver('/api/data');
      await resolver.update('Employee', '1', { name: 'Alice Updated' });

      expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
        query: 'update',
        variables: { type: 'Employee', id: '1', data: { name: 'Alice Updated' } },
      });
    });
  });

  describe('remove()', () => {
    it('posts a delete mutation', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: null }),
      });
      globalThis.fetch = mockFetch;

      const resolver = new HttpResolver('/api/data');
      await resolver.remove('Employee', '1');

      expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
        query: 'delete',
        variables: { type: 'Employee', id: '1' },
      });
    });
  });

  describe('when the response contains an error', () => {
    it('throws with the error message', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ error: 'Not found' }),
      });

      const resolver = new HttpResolver('/api/data');

      await expect(resolver.findOne('Employee', '999')).rejects.toThrow('Not found');
    });
  });
});
