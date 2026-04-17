import * as fs from 'node:fs';
import * as path from 'node:path';

export interface RegistryUploadOptions {
  gateway: string;
  httpsEnabled: boolean;
  token: string;
  archivePath: string;
  appRefId: string;
}

export interface RegistryUploadResult {
  id: string;
  referenceId: string;
  status: string;
  appType: string;
  creator: string;
}

const REGISTRY_UPLOAD_RESULT_KEYS: (keyof RegistryUploadResult)[] = [
  'id',
  'referenceId',
  'status',
  'appType',
  'creator',
];

function parseRegistryUploadResult(json: unknown): RegistryUploadResult {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    throw TypeError(
      `Expected JSON response to parse to an object, but was ${Object.prototype.toString.call(json)}`
    );
  }

  const record = json as Record<string, unknown>;
  const result = {} as RegistryUploadResult;

  for (const key of REGISTRY_UPLOAD_RESULT_KEYS) {
    const value = record[key];

    if (typeof value !== 'string') {
      throw TypeError(
        `Expected ${key} to be a string, but was ${Object.prototype.toString.call(value)}`
      );
    }

    result[key] = value;
  }
  return result;
}

export async function uploadToRegistry(
  options: RegistryUploadOptions
): Promise<RegistryUploadResult> {
  const { gateway, httpsEnabled, token, archivePath, appRefId } = options;

  const scheme = httpsEnabled ? 'https' : 'http';
  const url = new URL(`${scheme}://${gateway}/builder/v1/apps/source/archive`);

  const blob = await fs.openAsBlob(archivePath, { type: 'application/zip' });
  const filename = path.basename(archivePath);
  const form = new FormData();
  form.set('payload', new File([blob], filename, { type: 'application/zip' }));
  form.set('appRefId', appRefId);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to upload plugin: ${message}`, { cause: error });
  }

  if (!response.ok) {
    throw new Error('There was an error uploading your plugin to the registry');
  }

  const body: unknown = await response.json();
  return parseRegistryUploadResult(body);
}
