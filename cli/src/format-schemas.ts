import type { FieldSchema, ModelSchema } from './codegen/parser.js';

function formatFieldType(field: FieldSchema): string {
  let result = field.type;
  if (field.target) result += ` → ${field.target}`;
  if (field.precision) result += ` (precision: ${field.precision})`;
  return result;
}

function formatModel(model: ModelSchema): string {
  const maxNameLen = Math.max(0, ...model.fields.map((f) => f.name.length));
  const fieldCount = model.fields.length;
  const fieldWord = fieldCount === 1 ? 'field' : 'fields';
  const headline = `${model.name} — "${model.label}" (collection: ${model.collection}, ${fieldCount} ${fieldWord})`;
  const lines = model.fields.map((f) => `  ${f.name.padEnd(maxNameLen)}  ${formatFieldType(f)}`);
  return [headline, ...lines].join('\n');
}

export function formatSchemas(schemas: ModelSchema[]): string {
  return schemas.map(formatModel).join('\n\n');
}
