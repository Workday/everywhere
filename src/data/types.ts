export type FieldType = 'TEXT' | 'DATE' | 'BOOLEAN' | 'SINGLE_INSTANCE' | 'MULTI_INSTANCE';

export interface FieldSchema {
  name: string;
  type: FieldType;
  target?: string;
  precision?: string;
}

export interface ModelSchema {
  name: string;
  label: string;
  collection: string;
  fields: FieldSchema[];
}
