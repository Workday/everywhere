import type { DataResolver } from './resolver.js';
import type { ModelSchema } from './types.js';

function capitalize(s: string): string {
  return s.length === 0 ? '' : (s[0] as string).toUpperCase() + s.slice(1);
}

function referenceIdToGraphPrefix(referenceId: string): string {
  const parts = referenceId.split('_');
  const head = parts[0] ?? '';
  const capitalized = head.length === 0 ? '' : (head[0] as string).toUpperCase() + head.slice(1);
  const tail = parts.slice(1).join('_');
  return tail ? `${capitalized}_${tail}` : capitalized;
}

// Converts a JS value to a GraphQL inline literal (keys unquoted, strings quoted).
function toGQLLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(toGQLLiteral).join(', ')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${toGQLLiteral(v)}`)
      .join(', ');
    return `{${entries}}`;
  }
  return String(value);
}

const SCALAR_TYPES = new Set(['TEXT', 'BOOLEAN', 'DATE', 'CURRENCY', 'DECIMAL', 'NUMERIC']);

export class TridentResolver implements DataResolver {
  private readonly endpoint: string;
  private readonly bearerToken: string;
  private readonly referenceId: string;
  private readonly graphPrefix: string;
  private readonly schemaMap: Map<string, ModelSchema>;

  constructor(
    endpoint: string,
    bearerToken: string,
    referenceId: string,
    schemas: Record<string, ModelSchema>
  ) {
    this.endpoint = endpoint;
    this.bearerToken = bearerToken;
    this.referenceId = referenceId;
    this.graphPrefix = referenceIdToGraphPrefix(referenceId);
    this.schemaMap = new Map(Object.entries(schemas));
  }

  private schema(model: string): ModelSchema {
    const s = this.schemaMap.get(model);
    if (!s) throw new Error(`TridentResolver: no schema registered for model "${model}"`);
    return s;
  }

  // Scalar + derived fields only — SINGLE/MULTI_INSTANCE need nested selections handled separately.
  private selectionSet(schema: ModelSchema): string {
    const fields = schema.fields.filter((f) => SCALAR_TYPES.has(f.type)).map((f) => f.name);
    return ['workdayID { id type }', 'descriptor', ...fields].join('\n      ');
  }

  private async execute<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${this.bearerToken}`,
        'content-type': 'application/json',
        'wd-graphql-developer-info': 'false',
        'x-api-gateway-originator': 'ROBOT',
      },
      body: JSON.stringify(variables ? { query, variables } : { query }),
    });

    if (!response.ok) {
      throw new Error(`Trident ${response.status}: ${response.statusText}`);
    }

    const body = (await response.json()) as {
      data?: Record<string, unknown>;
      errors?: { message: string }[];
    };

    if (body.errors?.length) {
      throw new Error(body.errors.map((e) => e.message).join('; '));
    }

    return body.data as T;
  }

  async find<T>(model: string, filter?: Record<string, unknown>): Promise<T[]> {
    const schema = this.schema(model);
    const { collection } = schema;
    const opName = `${this.referenceId}_${collection}`;

    const dataSourceLiteral = filter
      ? `{${collection}: {filter: {${collection}Filter: ${toGQLLiteral(filter)}}}}`
      : `{${collection}: {}}`;

    const query = `query Find${model} {
  ${opName}(dataSource: ${dataSourceLiteral}) {
    data {
      ${this.selectionSet(schema)}
    }
  }
}`;

    const result =
      await this.execute<Record<string, { data: (T & { workdayID?: { id: string } })[] }>>(query);
    return (result[opName]?.data ?? []).map((item) => ({
      ...item,
      id: item.workdayID?.id ?? '',
    }));
  }

  async findOne<T>(model: string, id: string): Promise<T | null> {
    // TODO: filter by workdayID once the filter structure is confirmed via introspection.
    // For now fetch all and match client-side.
    const all = await this.find<T & { id: string }>(model);
    return all.find((item) => item.id === id) ?? null;
  }

  async create<T>(model: string, input: Omit<T, 'id'>): Promise<T> {
    const schema = this.schema(model);
    const { collection } = schema;
    // Convention confirmed in spike: {GraphPrefix}_{CapitalizedCollection}Summary_Create_Input
    const inputType = `${this.graphPrefix}_${capitalize(collection)}Summary_Create_Input`;
    const mutationName = `${this.referenceId}_create${model}`;

    const query = `mutation Create${model}($input: ${inputType}!) {
  ${mutationName}(input: $input) {
    ${this.selectionSet(schema)}
  }
}`;

    const result = await this.execute<Record<string, T & { workdayID?: { id: string } }>>(query, {
      input,
    });
    const item = result[mutationName];
    return { ...item, id: item?.workdayID?.id ?? '' } as unknown as T;
  }

  async update<T>(model: string, id: string, input: Partial<T>): Promise<T> {
    const schema = this.schema(model);
    const { collection } = schema;
    const inputType = `${this.graphPrefix}_${capitalize(collection)}Summary_Update_Input`;
    const mutationName = `${this.referenceId}_update${model}`;

    const query = `mutation Update${model}($id: String!, $input: ${inputType}!) {
  ${mutationName}(id: $id, input: $input) {
    ${this.selectionSet(schema)}
  }
}`;

    const result = await this.execute<Record<string, T & { workdayID?: { id: string } }>>(query, {
      id,
      input,
    });
    const item = result[mutationName];
    return { ...item, id: item?.workdayID?.id ?? '' } as unknown as T;
  }

  async remove(model: string, id: string): Promise<void> {
    const mutationName = `${this.referenceId}_delete${model}`;

    const query = `mutation Delete${model}($id: String!) {
  ${mutationName}(id: $id) {
    workdayID { id type }
  }
}`;

    await this.execute(query, { id });
  }
}
