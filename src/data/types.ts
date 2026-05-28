export type FieldType =
  | 'TEXT'
  | 'DATE'
  | 'BOOLEAN'
  | 'SINGLE_INSTANCE'
  | 'MULTI_INSTANCE'
  | 'CURRENCY'
  | 'DECIMAL'
  | 'NUMERIC';

export interface CurrencyValue {
  amount: number;
  currency: string;
}

export interface FieldSchema {
  name: string;
  type: FieldType;
  isDerived?: boolean;
  target?: string;
  precision?: string;
  /** When true, the mutation input wraps the IdentifierInput in a nested `id` field (Workday embedded input pattern). */
  embeddedInput?: boolean;
}

export interface GraphFieldMeta {
  /** True when the GraphQL field is nullable (not wrapped in NON_NULL). */
  nullable: boolean;
}

export interface GraphInputFieldMeta {
  /** True when the input field is NON_NULL (must be supplied). */
  required: boolean;
}

export interface GraphMetadata {
  /** DataSource key used in find() queries, e.g. "myApp_tenant_employees" */
  dataSourceKey: string;
  /** GraphQL input type name for create mutations */
  createInputType: string;
  /** GraphQL input type name for update mutations */
  updateInputType: string;
  /** Nullability per field, keyed by businessobject field name. */
  fields?: Record<string, GraphFieldMeta>;
  /** Requirement per create-input field, keyed by field name. */
  createInputFields?: Record<string, GraphInputFieldMeta>;
  /** Requirement per update-input field, keyed by field name. */
  updateInputFields?: Record<string, GraphInputFieldMeta>;
}

export interface ModelSchema {
  name: string;
  label: string;
  collection: string;
  securityDomains?: string[];
  fields: FieldSchema[];
  /** Present when bind successfully introspected the live GraphQL API. */
  graph?: GraphMetadata;
}
