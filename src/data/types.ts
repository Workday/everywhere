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
}

export interface ModelSchema {
  name: string;
  label: string;
  collection: string;
  securityDomains?: string[];
  fields: FieldSchema[];
}
