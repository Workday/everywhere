import type { FieldSchema, ModelSchema } from './codegen/parser.js';

function formatFieldType(field: FieldSchema): string {
  let result = field.type;
  if (field.target) result += ` → ${field.target}`;
  if (field.precision) result += ` (precision: ${field.precision})`;
  if (field.isDerived) result += ' [derived]';
  return result;
}

function formatModel(model: ModelSchema): string {
  const maxNameLen = Math.max(0, ...model.fields.map((f) => f.name.length));
  const regularCount = model.fields.filter((f) => !f.isDerived).length;
  const derivedCount = model.fields.filter((f) => f.isDerived).length;
  const fieldWord = regularCount === 1 ? 'field' : 'fields';
  const derivedPart = derivedCount > 0 ? `, ${derivedCount} derived` : '';
  const domainPart =
    model.securityDomains && model.securityDomains.length > 0
      ? `, domains: ${model.securityDomains.join(', ')}`
      : '';
  const headline = `${model.name} — "${model.label}" (collection: ${model.collection}, ${regularCount} ${fieldWord}${derivedPart}${domainPart})`;
  const lines = model.fields.map((f) => `  ${f.name.padEnd(maxNameLen)}  ${formatFieldType(f)}`);
  return [headline, ...lines].join('\n');
}

export function formatSchemas(schemas: ModelSchema[]): string {
  return schemas.map(formatModel).join('\n\n');
}
