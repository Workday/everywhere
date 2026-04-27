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

  // Lazily resolved: introspect CurrencyValue field names on first CURRENCY query.
  private currencyFieldsPromise: Promise<string> | null = null;

  private currencySubselection(): Promise<string> {
    if (!this.currencyFieldsPromise) {
      this.currencyFieldsPromise = this.execute<{
        __type: { fields: { name: string }[] } | null;
      }>('{ __type(name: "CurrencyValue") { fields { name } } }').then((result) => {
        const names = result.__type?.fields?.map((f) => f.name) ?? [];
        console.log('[TridentResolver] CurrencyValue fields:', names);
        return names.length > 0 ? names.join(' ') : 'value currency';
      });
    }
    return this.currencyFieldsPromise;
  }

  // Scalar + derived fields only — SINGLE/MULTI_INSTANCE need nested selections handled separately.
  private async selectionSetFor(schema: ModelSchema): Promise<string> {
    const hasCurrency = schema.fields.some((f) => f.type === 'CURRENCY');
    const currencyFields = hasCurrency ? await this.currencySubselection() : '';
    const fields = schema.fields
      .filter((f) => SCALAR_TYPES.has(f.type))
      .map((f) => (f.type === 'CURRENCY' ? `${f.name} { ${currencyFields} }` : f.name));
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

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Trident auth failed (${response.status}): bearer token is expired or invalid. Update BEARER_TOKEN in plugin.tsx.`
      );
    }

    if (!response.ok) {
      throw new Error(`Trident ${response.status}: ${response.statusText}`);
    }

    const body = (await response.json()) as {
      data?: Record<string, unknown>;
      errors?: { message: string; extensions?: { code?: string } }[];
    };

    if (body.errors?.length) {
      const isAuthError = body.errors.some((e) =>
        ['UNAUTHENTICATED', 'FORBIDDEN', 'UNAUTHORIZED'].includes(e.extensions?.code ?? '')
      );
      if (isAuthError) {
        throw new Error(
          'Trident auth error: bearer token is expired or invalid. Update BEARER_TOKEN in plugin.tsx.'
        );
      }
      throw new Error(body.errors.map((e) => e.message).join('; '));
    }

    return body.data as T;
  }

  async find<T>(model: string, filter?: Record<string, unknown>): Promise<T[]> {
    const schema = this.schema(model);
    const opName = `${this.referenceId}_${model}`;
    // DataSource key pattern from Trident spike: {referenceId}_{collection}
    const dsKey = `${this.referenceId}_${schema.collection}`;
    const dataSourceLiteral = filter
      ? `{${dsKey}: {filter: {${dsKey}Filter: ${toGQLLiteral(filter)}}}}`
      : `{${dsKey}: {}}`;

    const selectionSet = await this.selectionSetFor(schema);
    const query = `query Find${model} {
  ${opName}(dataSource: ${dataSourceLiteral}) {
    data {
      ${selectionSet}
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

    const selectionSet = await this.selectionSetFor(schema);
    const query = `mutation Create${model}($input: ${inputType}!) {
  ${mutationName}(input: $input) {
    ${selectionSet}
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

    const selectionSet = await this.selectionSetFor(schema);
    const query = `mutation Update${model}($id: String!, $input: ${inputType}!) {
  ${mutationName}(id: $id, input: $input) {
    ${selectionSet}
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
