import type { DataResolver } from './resolver.js';

export class HttpResolver implements DataResolver {
  private readonly graphqlUrl: string;

  constructor(baseUrl: string) {
    this.graphqlUrl = `${baseUrl}/graphql`;
  }

  async find<T>(model: string, filter?: Record<string, unknown>): Promise<T[]> {
    const variables: Record<string, unknown> = { type: model };
    if (filter) variables.filter = filter;
    return this.execute<T[]>('find', variables);
  }

  async findOne<T>(model: string, id: string): Promise<T | null> {
    return this.execute<T | null>('findOne', { type: model, id });
  }

  async create<T>(model: string, input: Omit<T, 'id'>): Promise<T> {
    return this.execute<T>('create', { type: model, data: input });
  }

  async update<T>(model: string, id: string, input: Partial<T>): Promise<T> {
    return this.execute<T>('update', { type: model, id, data: input });
  }

  async remove(model: string, id: string): Promise<void> {
    await this.execute('delete', { type: model, id });
  }

  private async execute<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const response = await fetch(this.graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });

    const body = (await response.json()) as { data?: T; error?: string };

    if (body.error) {
      throw new Error(body.error);
    }

    return body.data as T;
  }
}
