import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import JSZip from 'jszip';
import { appConfig } from '../config.js';
import { DEFAULT_GATEWAY } from '../auth/defaults.js';
import { GatewayClient, GatewayRequestError } from '../gateway/client.js';

interface GraphMetadata {
  dataSourceKey: string;
  createInputType: string;
  updateInputType: string;
  fields?: Record<string, { nullable: boolean }>;
  createInputFields?: Record<string, { required: boolean }>;
  updateInputFields?: Record<string, { required: boolean }>;
}

interface ModelSchema {
  name: string;
  collection: string;
  graph?: GraphMetadata;
}

function referenceIdToGraphTypePrefix(referenceId: string): string {
  const parts = referenceId.split('_');
  const head = parts[0] ?? '';
  const capitalized = head.length === 0 ? '' : head.charAt(0).toUpperCase() + head.slice(1);
  const tail = parts.slice(1).join('_');
  return tail ? `${capitalized}_${tail}` : capitalized;
}

export interface IntrospectionResult {
  /** Successfully enriched models, keyed by model name */
  graph: Record<string, GraphMetadata>;
  /** Models where introspection returned null for at least one field */
  missing: string[];
}

export type IntrospectionSkipReason =
  | { kind: 'no-token' }
  | { kind: 'no-manifest'; path: string }
  | { kind: 'network-error'; message: string }
  | { kind: 'api-error'; message: string };

export type IntrospectionOutcome =
  | { ok: true; result: IntrospectionResult }
  | { ok: false; reason: IntrospectionSkipReason };

const ACCURACY_IMPACT = 'Generated code may not accurately reflect the live GraphQL schema.';

export function applyIntrospectionOutcome<T extends ModelSchema>(
  schemas: T[],
  outcome: IntrospectionOutcome
): { schemas: T[]; warnings: string[] } {
  if (!outcome.ok) {
    const { reason } = outcome;
    if (reason.kind === 'no-token' || reason.kind === 'no-manifest') {
      return { schemas, warnings: [] };
    }
    return {
      schemas,
      warnings: [`GraphQL introspection failed — ${reason.message}.\n${ACCURACY_IMPACT}`],
    };
  }

  const { graph, missing } = outcome.result;
  const warnings: string[] = [];

  if (missing.length > 0) {
    warnings.push(
      `GraphQL introspection returned no data for: ${missing.join(', ')}.\n${ACCURACY_IMPACT}`
    );
  }

  const enriched = schemas.map((s) => {
    const graphMeta = graph[s.name];
    return graphMeta ? ({ ...s, graph: graphMeta } as T) : s;
  });

  return { schemas: enriched, warnings };
}

function capitalize(s: string): string {
  return s.length === 0 ? '' : s.charAt(0).toUpperCase() + s.slice(1);
}

async function readManifestContent(sourcePath: string, isZip: boolean): Promise<string | null> {
  if (isZip) {
    const buffer = await fsp.readFile(sourcePath);
    const zip = await JSZip.loadAsync(buffer);
    const entry = zip.files['appManifest.json'];
    if (!entry) return null;
    return entry.async('string');
  }
  const manifestPath = path.join(sourcePath, 'appManifest.json');
  if (!fs.existsSync(manifestPath)) return null;
  return fs.readFileSync(manifestPath, 'utf-8');
}

function buildQuery(graphPrefix: string, schemas: ModelSchema[]): string {
  const selections = schemas
    .map(({ name, collection }) => {
      const dsType = `${graphPrefix}_${name}_DataSources`;
      const createType = `${graphPrefix}_${capitalize(collection)}Summary_Create_Input`;
      const updateType = `${graphPrefix}_${capitalize(collection)}Summary_Update_Input`;
      const summaryType = `${graphPrefix}_${name}Summary`;
      return [
        `  ds_${name}: __type(name: ${JSON.stringify(dsType)}) { inputFields { name } }`,
        `  create_${name}: __type(name: ${JSON.stringify(createType)}) { name kind inputFields { name type { kind name ofType { kind name } } } }`,
        `  update_${name}: __type(name: ${JSON.stringify(updateType)}) { name kind inputFields { name type { kind name ofType { kind name } } } }`,
        `  summary_${name}: __type(name: ${JSON.stringify(summaryType)}) { fields { name type { kind name ofType { kind name } } } }`,
      ].join('\n');
    })
    .join('\n');
  return `query IntrospectBindTypes {\n${selections}\n}`;
}

export async function introspectGraphTypes<T extends ModelSchema>(
  schemas: T[],
  extendSourcePath: string,
  isZip: boolean
): Promise<IntrospectionOutcome> {
  const { auth = {} } = appConfig().read();
  if (!auth.token) {
    return { ok: false, reason: { kind: 'no-token' } };
  }
  const { gateway = DEFAULT_GATEWAY, token } = auth;

  let manifestContent: string | null;
  try {
    manifestContent = await readManifestContent(extendSourcePath, isZip);
  } catch {
    const manifestPath = isZip
      ? `${extendSourcePath}:appManifest.json`
      : path.join(extendSourcePath, 'appManifest.json');
    return { ok: false, reason: { kind: 'no-manifest', path: manifestPath } };
  }

  if (!manifestContent) {
    const manifestPath = isZip
      ? `${extendSourcePath}:appManifest.json`
      : path.join(extendSourcePath, 'appManifest.json');
    return { ok: false, reason: { kind: 'no-manifest', path: manifestPath } };
  }

  let manifest: { referenceId?: string };
  try {
    manifest = JSON.parse(manifestContent) as { referenceId?: string };
  } catch {
    return {
      ok: false,
      reason: {
        kind: 'no-manifest',
        path: isZip ? extendSourcePath : path.join(extendSourcePath, 'appManifest.json'),
      },
    };
  }

  if (typeof manifest.referenceId !== 'string' || !manifest.referenceId) {
    return {
      ok: false,
      reason: {
        kind: 'no-manifest',
        path: isZip ? extendSourcePath : path.join(extendSourcePath, 'appManifest.json'),
      },
    };
  }

  const { referenceId } = manifest;
  const graphPrefix = referenceIdToGraphTypePrefix(referenceId);
  const query = buildQuery(graphPrefix, schemas);
  const client = new GatewayClient({ gateway, token });

  let response: Response;
  try {
    response = await client.request({
      method: 'POST',
      path: '/api/v1/data/graphql',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
  } catch (e) {
    if (e instanceof GatewayRequestError) {
      const kind = e.status !== undefined ? 'api-error' : 'network-error';
      return { ok: false, reason: { kind, message: e.message } };
    }
    return {
      ok: false,
      reason: {
        kind: 'network-error',
        message: e instanceof Error ? e.message : String(e),
      },
    };
  }

  const body = (await response.json()) as {
    data?: Record<string, unknown>;
    errors?: { message: string }[];
  };

  if (body.errors?.length) {
    return {
      ok: false,
      reason: { kind: 'api-error', message: body.errors.map((e) => e.message).join('; ') },
    };
  }

  const data = body.data ?? {};
  const graph: Record<string, GraphMetadata> = {};
  const missing: string[] = [];

  type GqlTypeRef = {
    kind: string;
    name: string | null;
    ofType: { kind: string; name: string | null } | null;
  };
  type GqlInputField = { name: string; type: GqlTypeRef };
  type GqlSummaryField = { name: string; type: GqlTypeRef };

  for (const schema of schemas) {
    const { name, collection } = schema;

    const dsResult = data[`ds_${name}`] as { inputFields: { name: string }[] } | null;
    const createResult = data[`create_${name}`] as {
      name: string;
      kind: string;
      inputFields?: GqlInputField[];
    } | null;
    const updateResult = data[`update_${name}`] as {
      name: string;
      kind: string;
      inputFields?: GqlInputField[];
    } | null;
    const summaryResult = data[`summary_${name}`] as { fields?: GqlSummaryField[] } | null;

    const inputFields = dsResult?.inputFields ?? [];
    const preferred = inputFields.find((f) => f.name === `${referenceId}_${collection}`);
    const sorted = [...inputFields].sort((a, b) => a.name.localeCompare(b.name));
    const dataSourceKey = preferred?.name ?? sorted[0]?.name;

    const createInputType = createResult?.kind === 'INPUT_OBJECT' ? createResult.name : null;
    const updateInputType = updateResult?.kind === 'INPUT_OBJECT' ? updateResult.name : null;

    if (!dataSourceKey || !createInputType || !updateInputType) {
      missing.push(name);
    } else {
      const meta: GraphMetadata = { dataSourceKey, createInputType, updateInputType };

      if (summaryResult?.fields) {
        meta.fields = Object.fromEntries(
          summaryResult.fields.map((f) => [f.name, { nullable: f.type.kind !== 'NON_NULL' }])
        );
      }

      if (createResult?.inputFields) {
        meta.createInputFields = Object.fromEntries(
          createResult.inputFields.map((f) => [f.name, { required: f.type.kind === 'NON_NULL' }])
        );
      }

      if (updateResult?.inputFields) {
        meta.updateInputFields = Object.fromEntries(
          updateResult.inputFields.map((f) => [f.name, { required: f.type.kind === 'NON_NULL' }])
        );
      }

      graph[name] = meta;
    }
  }

  return { ok: true, result: { graph, missing } };
}
