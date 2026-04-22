#!/usr/bin/env node
/**
 * Reads extend app appManifest.json + model/*.businessobject, writes
 * everywhere/data/query.ts with GraphQL introspection for Workday Graph types.
 *
 * Prefer running with cwd set to the plugin root (directory that contains
 * everywhere/). Otherwise walks up from this file to find everywhere/.config.json,
 * or uses ../../src when that layout exists (compiled dist/build/ in this repo).
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function referenceIdToGraphTypePrefix(referenceId: string): string {
  const parts = referenceId.split('_');
  const head = parts[0] ?? '';
  const capitalized = head.length === 0 ? '' : head.charAt(0).toUpperCase() + head.slice(1);
  const tail = parts.slice(1).join('_');
  return tail ? `${capitalized}_${tail}` : capitalized;
}

function loadJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
}

function readExtendConfig(pluginRoot: string): { extend: string } {
  const configPath = join(pluginRoot, 'everywhere', '.config.json');
  if (!existsSync(configPath)) {
    throw new Error(
      `Missing ${configPath}. Set extend path via everywhere bind or create .config.json.`
    );
  }
  const raw = loadJson(configPath);
  if (!raw || typeof raw !== 'object' || !('extend' in raw)) {
    throw new Error(`${configPath} must be a JSON object with an "extend" string path`);
  }
  const extend = (raw as { extend: unknown }).extend;
  if (typeof extend !== 'string' || extend.length === 0) {
    throw new Error(`${configPath} must have a non-empty string "extend"`);
  }
  return { extend };
}

function readAppManifest(manifestPath: string): { referenceId: string } {
  if (!existsSync(manifestPath)) {
    throw new Error(`No appManifest.json at ${manifestPath}`);
  }
  const raw = loadJson(manifestPath);
  if (!raw || typeof raw !== 'object') {
    throw new Error(`${manifestPath} must be a JSON object`);
  }
  const referenceId = (raw as { referenceId?: unknown }).referenceId;
  if (typeof referenceId !== 'string' || referenceId.length === 0) {
    throw new Error(`${manifestPath} must contain a non-empty string referenceId`);
  }
  return { referenceId };
}

function discoverBusinessObjectNames(modelDir: string): string[] {
  if (!existsSync(modelDir)) {
    throw new Error(`No model/ directory at ${modelDir}`);
  }
  const names: string[] = [];
  for (const ent of readdirSync(modelDir, { withFileTypes: true })) {
    if (
      !ent.isFile() ||
      (!ent.name.endsWith('.businessobject') && !ent.name.endsWith('.attachment'))
    )
      continue;
    const full = join(modelDir, ent.name);
    const raw = loadJson(full);
    if (raw && typeof raw === 'object') {
      const name = (raw as { name?: unknown }).name;
      if (typeof name === 'string' && name.length > 0) {
        names.push(name);
      }
    }
  }
  return [...new Set(names)].sort();
}

function hasBusinessProcess(modelDir: string, boName: string): boolean {
  return existsSync(join(modelDir, `${boName}.businessprocess`));
}

function buildIntrospectionQuery(
  graphPrefix: string,
  businessObjectNames: string[],
  modelDir: string
): string {
  const typeTargets: { alias: string; typeName: string }[] = [];

  for (const bo of businessObjectNames) {
    typeTargets.push(
      { alias: `ds_${bo}`, typeName: `${graphPrefix}_${bo}_DataSources` },
      { alias: `row_${bo}`, typeName: `${graphPrefix}_${bo}` }
    );
    if (hasBusinessProcess(modelDir, bo)) {
      const eventName = `${bo}Event`;
      typeTargets.push(
        { alias: `ds_${bo}_event`, typeName: `${graphPrefix}_${eventName}_DataSources` },
        { alias: `row_${bo}_event`, typeName: `${graphPrefix}_${eventName}` }
      );
    }
  }

  const selections = typeTargets
    .map(
      ({ alias, typeName }) => `  ${alias}: __type(name: "${typeName}") {
    kind
    name
    description
    inputFields {
      name
      description
      type { ...TypeRef }
    }
    fields {
      name
      description
      type { ...TypeRef }
    }
  }`
    )
    .join('\n\n');

  return `query IntrospectAppGraphTypes {
${selections}
}

fragment TypeRef on __Type {
  kind
  name
  ofType {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
            }
          }
        }
      }
    }
  }
}`;
}

function resolvePluginRoot(): string {
  const cwd = process.cwd();
  if (existsSync(join(cwd, 'everywhere', '.config.json'))) {
    return cwd;
  }
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  for (let dir = scriptDir, depth = 0; depth < 16; depth++) {
    if (existsSync(join(dir, 'everywhere', '.config.json'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  const sdkStyleRoot = resolve(scriptDir, '..', '..', 'src');
  if (existsSync(join(sdkStyleRoot, 'everywhere', '.config.json'))) {
    return sdkStyleRoot;
  }
  return resolve(scriptDir, '..');
}

export function generateGraphSchemaQueryFiles(pluginRoot: string): void {
  const { extend } = readExtendConfig(pluginRoot);
  const extendPath = resolve(pluginRoot, extend);
  const manifestPath = join(extendPath, 'appManifest.json');
  const { referenceId } = readAppManifest(manifestPath);

  const graphTypePrefix = referenceIdToGraphTypePrefix(referenceId);
  const modelDir = join(extendPath, 'model');
  const businessObjectNames = discoverBusinessObjectNames(modelDir);
  if (businessObjectNames.length === 0) {
    throw new Error(`No .businessobject or .attachment definitions in ${modelDir}`);
  }

  const introspectionQuery = buildIntrospectionQuery(
    graphTypePrefix,
    businessObjectNames,
    modelDir
  );

  const boList = businessObjectNames.map((n) => ` * - ${n}`).join('\n');
  const outputPath = join(pluginRoot, 'everywhere', 'data', 'query.ts');

  const file = `// AUTO-GENERATED by src/build/generate-graph-schema-query.ts — do not edit manually.

/** \`referenceId\` from extend app appManifest.json */
export const REFERENCE_ID = ${JSON.stringify(referenceId)} as const;

/**
 * GraphQL type / schema prefix derived from \`referenceId\` (first segment capitalized, rest unchanged).
 * Example: \`workFromAlmostAnywhere_mcwslt\` → \`WorkFromAlmostAnywhere_mcwslt\`
 */
export const GRAPH_TYPE_PREFIX = ${JSON.stringify(graphTypePrefix)} as const;

/**
 * Business object \`name\` values from extend \`model/*.businessobject\` (used to build __type names).
${boList}
 */

export const BUSINESS_OBJECT_NAMES = ${JSON.stringify(businessObjectNames)} as const;

/**
 * Paste into Workday Graph Explorer (or POST to Graph API) to resolve
 * \`DataSources\` input keys, filters, and selectable fields for this app's types.
 * Missing types return \`null\` for that alias.
 */
export const INTROSPECT_APP_GRAPH_TYPES = \`
${introspectionQuery.replace(/`/g, '\\`').replace(/\$/g, '\\$')}
\` as const;
`;

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, file, 'utf8');
  console.log(
    `Wrote ${relative(pluginRoot, outputPath)} (referenceId=${referenceId}, BOs=${businessObjectNames.join(', ')})`
  );
}

function main(): void {
  generateGraphSchemaQueryFiles(resolvePluginRoot());
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(resolve(entry)).href) {
  main();
}
