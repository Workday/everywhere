export interface DataResolver {
  find<T>(model: string, filter?: Record<string, unknown>): Promise<T[]>;
  findOne<T>(model: string, id: string): Promise<T | null>;
  create<T>(model: string, input: Omit<T, 'id'>): Promise<T>;
  update<T>(model: string, id: string, input: Partial<T>): Promise<T>;
  remove(model: string, id: string): Promise<void>;
}
