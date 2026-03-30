import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { LocalStore } from '../../src/data/local-store.js';

let tmpDir: string;
let store: LocalStore;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'we-store-'));
  store = new LocalStore(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('LocalStore', () => {
  describe('find()', () => {
    it('returns an empty array when no data file exists', async () => {
      const result = await store.find('Employee');

      expect(result).toEqual([]);
    });

    it('returns all records from an existing data file', async () => {
      const records = [{ id: '1', name: 'Alice' }];
      fs.writeFileSync(path.join(tmpDir, 'Employee.json'), JSON.stringify(records));

      const result = await store.find('Employee');

      expect(result).toEqual(records);
    });

    describe('with a filter', () => {
      it('returns only matching records', async () => {
        const records = [
          { id: '1', name: 'Alice', dept: 'Eng' },
          { id: '2', name: 'Bob', dept: 'Sales' },
        ];
        fs.writeFileSync(path.join(tmpDir, 'Employee.json'), JSON.stringify(records));

        const result = await store.find('Employee', { dept: 'Eng' });

        expect(result).toEqual([records[0]]);
      });
    });
  });

  describe('findOne()', () => {
    it('returns null when the record does not exist', async () => {
      const result = await store.findOne('Employee', '999');

      expect(result).toBeNull();
    });

    it('returns the matching record by id', async () => {
      const records = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ];
      fs.writeFileSync(path.join(tmpDir, 'Employee.json'), JSON.stringify(records));

      const result = await store.findOne('Employee', '2');

      expect(result).toEqual({ id: '2', name: 'Bob' });
    });
  });

  describe('create()', () => {
    it('returns a record with a generated id', async () => {
      const result = await store.create('Employee', { name: 'Alice' });

      expect(result.id).toBeDefined();
    });

    it('persists the record to disk', async () => {
      await store.create('Employee', { name: 'Alice' });

      const data = JSON.parse(fs.readFileSync(path.join(tmpDir, 'Employee.json'), 'utf-8'));
      expect(data).toHaveLength(1);
    });

    it('creates the data directory if it does not exist', async () => {
      const nestedDir = path.join(tmpDir, 'sub', 'dir');
      const nestedStore = new LocalStore(nestedDir);

      await nestedStore.create('Employee', { name: 'Alice' });

      expect(fs.existsSync(path.join(nestedDir, 'Employee.json'))).toBe(true);
    });
  });

  describe('update()', () => {
    it('merges the input into the existing record', async () => {
      const records = [{ id: '1', name: 'Alice', dept: 'Eng' }];
      fs.writeFileSync(path.join(tmpDir, 'Employee.json'), JSON.stringify(records));

      const result = await store.update('Employee', '1', { name: 'Alice Updated' });

      expect(result.name).toBe('Alice Updated');
    });

    it('preserves fields not in the input', async () => {
      const records = [{ id: '1', name: 'Alice', dept: 'Eng' }];
      fs.writeFileSync(path.join(tmpDir, 'Employee.json'), JSON.stringify(records));

      const result = await store.update('Employee', '1', { name: 'Alice Updated' });

      expect(result.dept).toBe('Eng');
    });

    it('persists the update to disk', async () => {
      const records = [{ id: '1', name: 'Alice' }];
      fs.writeFileSync(path.join(tmpDir, 'Employee.json'), JSON.stringify(records));

      await store.update('Employee', '1', { name: 'Alice Updated' });

      const data = JSON.parse(fs.readFileSync(path.join(tmpDir, 'Employee.json'), 'utf-8'));
      expect(data[0].name).toBe('Alice Updated');
    });

    describe('when the record does not exist', () => {
      it('throws an error', async () => {
        await expect(store.update('Employee', '999', { name: 'X' })).rejects.toThrow(
          'Record not found'
        );
      });
    });
  });

  describe('remove()', () => {
    it('removes the record from disk', async () => {
      const records = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ];
      fs.writeFileSync(path.join(tmpDir, 'Employee.json'), JSON.stringify(records));

      await store.remove('Employee', '1');

      const data = JSON.parse(fs.readFileSync(path.join(tmpDir, 'Employee.json'), 'utf-8'));
      expect(data).toHaveLength(1);
    });

    it('keeps other records intact', async () => {
      const records = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ];
      fs.writeFileSync(path.join(tmpDir, 'Employee.json'), JSON.stringify(records));

      await store.remove('Employee', '1');

      const data = JSON.parse(fs.readFileSync(path.join(tmpDir, 'Employee.json'), 'utf-8'));
      expect(data[0].id).toBe('2');
    });
  });
});
