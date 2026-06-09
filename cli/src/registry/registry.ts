import * as fs from 'node:fs';
import { GatewayClient, GatewayRequestError, type VerboseLogger } from '../gateway/client.js';

export interface RegistryUploadOptions {
  gateway: string;
  token: string;
  archivePath: string;
  logger?: VerboseLogger;
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
  token: string;
  appId: string;
  logger?: VerboseLogger;
}

export async function deleteFromRegistry(options: RegistryDeleteOptions): Promise<void> {
  const { gateway, token, appId } = options;
  const client = new GatewayClient({ gateway, token, logger: options.logger });

  try {
    await client.delete(`/api/v1/app/${appId}`);
  } catch (err) {
    if (err instanceof GatewayRequestError) {
      throw new Error(`Failed to unpublish plugin: ${err.message}`, { cause: err });
    }
    throw err;
  }
}

export async function uploadToRegistry(
  options: RegistryUploadOptions
): Promise<RegistryUploadResult> {
  const { gateway, token, archivePath } = options;
  const client = new GatewayClient({ gateway, token, logger: options.logger });

  const blob = await fs.openAsBlob(archivePath, { type: 'application/zip' });

  let response: Response;
  try {
    response = await client.request({
      method: 'POST',
      path: '/api/v1/apps/publish',
      body: blob,
      headers: { 'Content-Type': 'application/zip' },
    });
  } catch (err) {
    if (err instanceof GatewayRequestError) {
      throw new Error(`Failed to upload plugin: ${err.message}`, { cause: err });
    }
    throw err;
  }

  const body: unknown = await response.json();
  return parseRegistryUploadResult(body);
}
