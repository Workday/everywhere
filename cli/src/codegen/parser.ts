export interface FieldSchema {
  name: string;
  type: string;
  isDerived?: boolean;
  target?: string;
  precision?: string;
}

export interface ModelSchema {
  name: string;
  label: string;
  collection: string;
  securityDomains: string[];
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
  defaultSecurityDomains?: string[];
  defaultCollection: { name: string };
  fields: BusinessObjectField[];
  derivedFields?: BusinessObjectField[];
}

export function parseBusinessObject(definition: BusinessObjectDefinition): ModelSchema {
  const regularFields = definition.fields.map(parseField);
  const derivedFields = (definition.derivedFields ?? []).map((f) => ({
    ...parseField(f),
    isDerived: true as const,
  }));

  return {
    name: definition.name,
    label: definition.label,
    collection: definition.defaultCollection.name,
    securityDomains: definition.defaultSecurityDomains ?? [],
    fields: [...regularFields, ...derivedFields],
  };
}

function parseField(field: BusinessObjectField): FieldSchema {
  const schema: FieldSchema = {
    name: field.name,
    type: field.type,
  };

  if (field.target) {
    schema.target = field.target;
  }

  if (field.precision) {
    schema.precision = field.precision;
  }

  return schema;
}
