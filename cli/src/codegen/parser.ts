export interface FieldSchema {
  name: string;
  type: string;
  target?: string;
  precision?: string;
}

export interface ModelSchema {
  name: string;
  label: string;
  collection: string;
  fields: FieldSchema[];
}

interface BusinessObjectField {
  name: string;
  type: string;
  target?: string;
  precision?: string;
}

interface BusinessObjectDefinition {
  name: string;
  label: string;
  defaultCollection: { name: string };
  fields: BusinessObjectField[];
}

export function parseBusinessObject(definition: BusinessObjectDefinition): ModelSchema {
  return {
    name: definition.name,
    label: definition.label,
    collection: definition.defaultCollection.name,
    fields: definition.fields.map(parseField),
  };
}

function parseField(field: BusinessObjectField): FieldSchema {
  const schema: FieldSchema = {
    name: field.name,
    type: field.type as FieldSchema['type'],
  };

  if (field.target) {
    schema.target = field.target;
  }

  if (field.precision) {
    schema.precision = field.precision;
  }

  return schema;
}
