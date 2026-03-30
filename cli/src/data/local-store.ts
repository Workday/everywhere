import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

type DataRecord = Record<string, unknown> & { id: string };

export class LocalStore {
  constructor(private readonly dataDir: string) {}

  async find(type: string, filter?: Record<string, unknown>): Promise<DataRecord[]> {
    const records = this.readFile(type);
    if (!filter) return records;

    return records.filter((record) =>
      Object.entries(filter).every(([key, value]) => record[key] === value)
    );
  }

  async findOne(type: string, id: string): Promise<DataRecord | null> {
    const records = this.readFile(type);
    return records.find((r) => r.id === id) ?? null;
  }

  async create(type: string, data: Record<string, unknown>): Promise<DataRecord> {
    const records = this.readFile(type);
    const record: DataRecord = { id: crypto.randomUUID(), ...data };
    records.push(record);
    this.writeFile(type, records);
    return record;
  }

  async update(type: string, id: string, data: Record<string, unknown>): Promise<DataRecord> {
    const records = this.readFile(type);
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('Record not found');

    const updated = { ...records[index], ...data, id } as DataRecord;
    records[index] = updated;
    this.writeFile(type, records);
    return updated;
  }

  async remove(type: string, id: string): Promise<void> {
    const records = this.readFile(type);
    const filtered = records.filter((r) => r.id !== id);
    this.writeFile(type, filtered);
  }

  private readFile(type: string): DataRecord[] {
    const filePath = path.join(this.dataDir, `${type}.json`);
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as DataRecord[];
  }

  private writeFile(type: string, records: DataRecord[]): void {
    fs.mkdirSync(this.dataDir, { recursive: true });
    const filePath = path.join(this.dataDir, `${type}.json`);
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2) + '\n');
  }
}
