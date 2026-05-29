import type { DataResolver } from './resolver.js';
import type { ModelSchema } from './types.js';

function capitalize(s: string): string {
  return s.length === 0 ? '' : (s[0] as string).toUpperCase() + s.slice(1);
}

function collectionIdArg(collection: string): string {
  return `${collection}Id`;
}

interface WorkdayIdentifier {
  id: string;
  type: string;
}

const DEFAULT_WORKDAY_ID_TYPE = 'WID';

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

export class GraphQLResolver implements DataResolver {
  private readonly endpoint: string;
  private readonly referenceId: string;
  private readonly graphPrefix: string;
  private readonly schemaMap: Map<string, ModelSchema>;
  private readonly workdayIdTypes = new Map<string, string>();

  constructor(referenceId: string, schemas: Record<string, ModelSchema>, endpoint?: string) {
    this.endpoint = endpoint ?? `${globalThis.window?.location.origin ?? ''}/api/v1/data/graphql`;
    this.referenceId = referenceId;
    this.graphPrefix = referenceIdToGraphPrefix(referenceId);
    this.schemaMap = new Map(Object.entries(schemas));
  }

  private schema(model: string): ModelSchema {
    const s = this.schemaMap.get(model);
    if (!s) throw new Error(`GraphQLResolver: no schema registered for model "${model}"`);
    return s;
  }

  private workdayIdCacheKey(model: string, id: string): string {
    return `${model}:${id}`;
  }

  private rememberWorkdayIdType(model: string, workdayID?: { id?: string; type?: string }): void {
    if (workdayID?.id && workdayID.type) {
      this.workdayIdTypes.set(this.workdayIdCacheKey(model, workdayID.id), workdayID.type);
    }
  }

  private identifierInput(model: string, id: string): WorkdayIdentifier {
    const type =
      this.workdayIdTypes.get(this.workdayIdCacheKey(model, id)) ?? DEFAULT_WORKDAY_ID_TYPE;
    return { id, type };
  }

  private async ensureWorkdayIdType(model: string, id: string): Promise<void> {
    if (this.workdayIdTypes.has(this.workdayIdCacheKey(model, id))) return;
    await this.findOne(model, id);
  }

  private mapItem<T>(
    model: string,
    schema: ModelSchema,
    item: T & { workdayID?: { id: string; type: string } }
  ): T & { id: string } {
    this.rememberWorkdayIdType(model, item.workdayID);
    const mapped: Record<string, unknown> = { ...item, id: item.workdayID?.id ?? '' };

    for (const field of schema.fields) {
      if (field.type !== 'SINGLE_INSTANCE' || field.isDerived) continue;
      const ref = mapped[field.name] as { workdayID?: { id: string; type: string } } | undefined;
      if (ref?.workdayID?.id) {
        const target = field.target ?? model;
        this.rememberWorkdayIdType(target, ref.workdayID);
        mapped[field.name] = ref.workdayID.id;
      }
    }

    return mapped as T & { id: string };
  }

  private normalizeMutationInput(
    schema: ModelSchema,
    input: Record<string, unknown>
  ): Record<string, unknown> {
    const normalized = { ...input };

    for (const field of schema.fields) {
      if (field.type !== 'SINGLE_INSTANCE' || field.isDerived) continue;
      const value = normalized[field.name];
      if (typeof value === 'string' && value.length > 0) {
        const target = field.target ?? schema.name;
        const identifier = this.identifierInput(target, value);
        normalized[field.name] = field.embeddedInput ? { id: identifier } : identifier;
      }
    }

    return normalized;
  }

  // Lazily resolved: introspect CurrencyValue field names on first CURRENCY query.
  private currencyFieldsPromise: Promise<string> | null = null;

  private currencySubselection(): Promise<string> {
    if (!this.currencyFieldsPromise) {
      this.currencyFieldsPromise = this.execute<{
        __type: { fields: { name: string }[] } | null;
      }>('{ __type(name: "CurrencyValue") { fields { name } } }').then((result) => {
        const names = result.__type?.fields?.map((f) => f.name) ?? [];
        return names.length > 0 ? names.join(' ') : 'value currency';
      });
    }
    return this.currencyFieldsPromise;
  }

  private async selectionSetFor(schema: ModelSchema): Promise<string> {
    const hasCurrency = schema.fields.some((f) => f.type === 'CURRENCY');
    const currencyFields = hasCurrency ? await this.currencySubselection() : '';
    const scalarFields = schema.fields
      .filter((f) => SCALAR_TYPES.has(f.type))
      .map((f) => (f.type === 'CURRENCY' ? `${f.name} { ${currencyFields} }` : f.name));
    const instanceFields = schema.fields
      .filter((f) => f.type === 'SINGLE_INSTANCE' && !f.isDerived)
      .map((f) => `${f.name} { workdayID { id type } }`);
    return ['workdayID { id type }', 'descriptor', ...scalarFields, ...instanceFields].join(
      '\n      '
    );
  }

  private async execute<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const headers: Record<string, string> = {
      accept: 'application/json',
      'content-type': 'application/json',
    };

    const appId = (globalThis as { __WE_APP_ID__?: string }).__WE_APP_ID__;
    if (typeof appId === 'string') headers['x-app-id'] = appId;

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(variables ? { query, variables } : { query }),
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `GraphQL auth failed (${response.status}): token is expired or invalid. Run: npx @workday/everywhere auth login`
      );
    }

    if (!response.ok) {
      throw new Error(`GraphQL request failed ${response.status}: ${response.statusText}`);
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
          'GraphQL auth error: token is expired or invalid. Run: npx @workday/everywhere auth login'
        );
      }
      throw new Error(body.errors.map((e) => e.message).join('; '));
    }

    return body.data as T;
  }

  async find<T>(model: string, filter?: Record<string, unknown>): Promise<T[]> {
    const schema = this.schema(model);
    const opName = `${this.referenceId}_${model}`;
    const dsKey = schema.graph?.dataSourceKey ?? `${this.referenceId}_${schema.collection}`;
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
      await this.execute<
        Record<string, { data: (T & { workdayID?: { id: string; type: string } })[] }>
      >(query);
    return (result[opName]?.data ?? []).map((item) => this.mapItem(model, schema, item));
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
    const inputType =
      schema.graph?.createInputType ??
      `${this.graphPrefix}_${capitalize(collection)}Summary_Create_Input`;
    const mutationName = `${this.referenceId}_create${model}`;

    const selectionSet = await this.selectionSetFor(schema);
    const query = `mutation Create${model}($input: ${inputType}!) {
  ${mutationName}(input: $input) {
    ${selectionSet}
  }
}`;

    const result = await this.execute<
      Record<string, T & { workdayID?: { id: string; type: string } }>
    >(query, {
      input: this.normalizeMutationInput(schema, input as Record<string, unknown>),
    });
    const item = result[mutationName];
    if (!item) throw new Error(`GraphQL mutation ${mutationName} returned no data`);
    return this.mapItem(model, schema, item) as unknown as T;
  }

  async update<T>(model: string, id: string, input: Partial<T>): Promise<T> {
    const schema = this.schema(model);
    const { collection } = schema;
    const idArg = collectionIdArg(collection);
    const inputType =
      schema.graph?.updateInputType ??
      `${this.graphPrefix}_${capitalize(collection)}Summary_Update_Input`;
    const mutationName = `${this.referenceId}_update${model}`;

    await this.ensureWorkdayIdType(model, id);
    const identifier = this.identifierInput(model, id);

    const selectionSet = await this.selectionSetFor(schema);
    const query = `mutation Update${model}($${idArg}: IdentifierInput!, $input: ${inputType}!) {
  ${mutationName}(${idArg}: $${idArg}, input: $input) {
    ${selectionSet}
  }
}`;

    const result = await this.execute<
      Record<string, T & { workdayID?: { id: string; type: string } }>
    >(query, {
      [idArg]: identifier,
      input: this.normalizeMutationInput(schema, input as Record<string, unknown>),
    });
    const item = result[mutationName];
    if (!item) throw new Error(`GraphQL mutation ${mutationName} returned no data`);
    return this.mapItem(model, schema, item) as unknown as T;
  }

  async remove(model: string, id: string): Promise<void> {
    const schema = this.schema(model);
    const idArg = collectionIdArg(schema.collection);
    const mutationName = `${this.referenceId}_delete${model}`;

    await this.ensureWorkdayIdType(model, id);
    const identifier = this.identifierInput(model, id);

    const query = `mutation Delete${model}($${idArg}: IdentifierInput!) {
  ${mutationName}(${idArg}: $${idArg}) {
    workdayID { id type }
  }
}`;

    await this.execute(query, { [idArg]: identifier });
  }
}
