import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { handleGraphQL } from '../../src/data/graphql-handler.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'we-handler-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function query(op: string, variables: Record<string, unknown> = {}) {
  return handleGraphQL(tmpDir, { query: op, variables });
}

describe('handleGraphQL()', () => {
  describe('find', () => {
    it('returns an empty array when no data exists', async () => {
      const result = await query('find', { type: 'Employee' });

      expect(result).toEqual({ data: [] });
    });

    it('returns all records for a type', async () => {
      const records = [{ id: '1', name: 'Alice' }];
      fs.writeFileSync(path.join(tmpDir, 'Employee.json'), JSON.stringify(records));

      const result = await query('find', { type: 'Employee' });

      expect(result).toEqual({ data: records });
    });
  });

  describe('findOne', () => {
    it('returns a single record by id', async () => {
      const records = [{ id: '1', name: 'Alice' }];
      fs.writeFileSync(path.join(tmpDir, 'Employee.json'), JSON.stringify(records));

      const result = await query('findOne', { type: 'Employee', id: '1' });

      expect(result).toEqual({ data: records[0] });
    });

    it('returns null when the record does not exist', async () => {
      const result = await query('findOne', { type: 'Employee', id: '999' });

      expect(result).toEqual({ data: null });
    });
  });

  describe('create', () => {
    it('returns the created record with an id', async () => {
      const result = await query('create', { type: 'Employee', data: { name: 'Alice' } });

      expect((result as { data: { id: string } }).data.id).toBeDefined();
    });

    it('persists the record', async () => {
      await query('create', { type: 'Employee', data: { name: 'Alice' } });

      const data = JSON.parse(fs.readFileSync(path.join(tmpDir, 'Employee.json'), 'utf-8'));
      expect(data).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('returns the updated record', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'Employee.json'),
        JSON.stringify([{ id: '1', name: 'Alice' }])
      );

      const result = await query('update', {
        type: 'Employee',
        id: '1',
        data: { name: 'Alice Updated' },
      });

      expect((result as { data: { name: string } }).data.name).toBe('Alice Updated');
    });
  });

  describe('delete', () => {
    it('removes the record', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'Employee.json'),
        JSON.stringify([{ id: '1', name: 'Alice' }])
      );

      await query('delete', { type: 'Employee', id: '1' });

      const data = JSON.parse(fs.readFileSync(path.join(tmpDir, 'Employee.json'), 'utf-8'));
      expect(data).toHaveLength(0);
    });
  });

  describe('unknown operation', () => {
    it('returns an error', async () => {
      const result = await query('unknown', { type: 'Employee' });

      expect(result).toEqual({ error: 'Unknown operation: unknown' });
    });
  });
});
