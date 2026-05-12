import * as fs from 'node:fs';

export interface RegistryUploadOptions {
  gateway: string;
  httpsEnabled: boolean;
  token: string;
  archivePath: string;
}

export interface RegistryUploadResult {
  tenant: string;
  name: string;
  title: string;
  bundleUrl: string;
}

const REGISTRY_UPLOAD_RESULT_KEYS: (keyof RegistryUploadResult)[] = [
  'tenant',
  'name',
  'title',
  'bundleUrl',
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

export interface RegistryDeleteOptions {
  gateway: string;
  httpsEnabled: boolean;
  token: string;
  appId: string;
}

export async function deleteFromRegistry(options: RegistryDeleteOptions): Promise<void> {
  const { gateway, httpsEnabled, token, appId } = options;

  const scheme = httpsEnabled ? 'https' : 'http';
  const url = new URL(`${scheme}://${gateway}/api/v1/app/${appId}`);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to unpublish plugin: ${message}`, { cause: error });
  }

  if (!response.ok) {
    throw new Error('There was an error unpublishing your plugin from the registry');
  }
}

export async function uploadToRegistry(
  options: RegistryUploadOptions
): Promise<RegistryUploadResult> {
  const { gateway, httpsEnabled, token, archivePath } = options;

  const scheme = httpsEnabled ? 'https' : 'http';
  const url = new URL(`${scheme}://${gateway}/api/v1/apps/publish`);

  const blob = await fs.openAsBlob(archivePath, { type: 'application/zip' });

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/zip',
      },
      body: blob,
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
