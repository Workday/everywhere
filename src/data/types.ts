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

export interface ModelSchema {
  name: string;
  label: string;
  collection: string;
  securityDomains?: string[];
  fields: FieldSchema[];
}
