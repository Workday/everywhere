import { EXTEND_APPLICATION_ID, REFERENCE_ID } from '../everywhere/extend.js';
import { cacheLogoFromFile, getCachedLogoSrc, setCachedLogoSrc } from './logoCache.js';
const FILE_FIELD = 'logoFile';

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

type CharityLogoUploadResult = {
  [key: string]: {
    charityLogos?: { workdayID?: { id: string; type: string } }[];
  };
};

function graphqlUrl(): string {
  return `${globalThis.window?.location.origin ?? ''}/api/v1/data/graphql`;
}

function requestHeaders(): Record<string, string> {
  const headers: Record<string, string> = { accept: 'application/json' };
  const appId = (globalThis as { __WE_APP_ID__?: string }).__WE_APP_ID__;
  if (typeof appId === 'string') headers['x-app-id'] = appId;
  return headers;
}

async function parseGraphQLResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let body: GraphQLResponse<T>;

  try {
    body = JSON.parse(text) as GraphQLResponse<T>;
  } catch {
    const hint = text.trimStart().startsWith('<!')
      ? 'The server returned HTML instead of JSON. Use `everywhere view` (not mock data) with a valid auth login.'
      : text.slice(0, 240);
    throw new Error(`Unexpected response (${response.status}): ${hint}`);
  }

  if (body.errors?.length) {
    throw new Error(body.errors.map((e) => e.message).join('; '));
  }

  if (!response.ok) {
    throw new Error(`GraphQL request failed (${response.status})`);
  }

  return body.data as T;
}

export const ACCEPTED_LOGO_TYPES = ['image/gif', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export function validateLogoFile(file: File): string | null {
  if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
    return 'Logo must be a GIF, JPG, or PNG image.';
  }
  if (file.size > MAX_LOGO_BYTES) {
    return 'Logo must be 5 MB or smaller.';
  }
  return null;
}

/** Same path as the native Extend app (`apiGatewayEndpoint + /apps/.../v1/charityLogos/{id}`). */
export function getCharityLogoUrl(logoId: string): string {
  const origin = globalThis.window?.location.origin ?? '';
  return `${origin}/apps/${EXTEND_APPLICATION_ID}/v1/charityLogos/${encodeURIComponent(logoId)}`;
}

/** Dev-only cache written by `everywhere view` (survives page reloads). */
export function getLocalDevLogoUrl(logoId: string, fileName?: string): string {
  const origin = globalThis.window?.location.origin ?? '';
  const ext = fileName?.split('.').pop()?.toLowerCase();
  const query = ext ? `?ext=${encodeURIComponent(ext)}` : '';
  return `${origin}/api/v1/local/charity-logos/${encodeURIComponent(logoId)}${query}`;
}

function isImageResponse(response: Response, blob: Blob): boolean {
  const type = blob.type || response.headers.get('content-type') || '';
  if (type.includes('html') || type.includes('json')) return false;
  return type.startsWith('image/');
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read logo blob'));
    reader.readAsDataURL(blob);
  });
}

/** Tries a URL and returns a data URL when the response is an image. */
export async function tryFetchLogoAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!isImageResponse(response, blob)) return null;
    return blobToDataUrl(blob);
  } catch {
    return null;
  }
}

/** Resolves a displayable logo src: session cache, local dev cache, then Extend attachment API. */
export async function resolveCharityLogoSrc(
  logoId: string,
  fileName?: string
): Promise<string | null> {
  const cached = getCachedLogoSrc(logoId);
  if (cached) return cached;

  const localUrl = getLocalDevLogoUrl(logoId, fileName);
  const localDataUrl = await tryFetchLogoAsDataUrl(localUrl);
  if (localDataUrl) {
    setCachedLogoSrc(logoId, localDataUrl);
    return localDataUrl;
  }

  const remoteDataUrl = await tryFetchLogoAsDataUrl(getCharityLogoUrl(logoId));
  if (remoteDataUrl) {
    setCachedLogoSrc(logoId, remoteDataUrl);
    return remoteDataUrl;
  }

  return null;
}

/** Persists logo bytes for local `everywhere view` (ignored when endpoint is unavailable). */
export async function persistLogoToDevCache(logoId: string, file: File): Promise<void> {
  try {
    const response = await fetch(getLocalDevLogoUrl(logoId, file.name), {
      method: 'POST',
      headers: { 'content-type': file.type || 'application/octet-stream' },
      body: file,
    });
    if (!response.ok && response.status !== 404) return;
  } catch {
    return;
  }
  await cacheLogoFromFile(logoId, file);
}

/**
 * Uploads a charity logo via GraphQL multipart (Workday multipart v3: file field name in query).
 * Uses the same /api/v1/data/graphql endpoint as GraphQLResolver.
 */
export async function uploadCharityLogo(file: File): Promise<string> {
  const validationError = validateLogoFile(file);
  if (validationError) throw new Error(validationError);

  const uploadedDate = new Date().toISOString();
  const query = `mutation { ${REFERENCE_ID}_createCharityLogosCollection(input: { charityLogos: [{ attachmentContent: "${FILE_FIELD}", fileName: ${JSON.stringify(file.name)}, fileLength: ${file.size}, uploadedDate: "${uploadedDate}" }] }) { charityLogos { workdayID { id type } } } }`;

  const formData = new FormData();
  formData.append('operations', JSON.stringify({ query }));
  formData.append(FILE_FIELD, file, file.name);

  const response = await fetch(graphqlUrl(), {
    method: 'POST',
    headers: requestHeaders(),
    body: formData,
    credentials: 'include',
  });

  const data = await parseGraphQLResponse<CharityLogoUploadResult>(response);
  const logoId =
    data[`${REFERENCE_ID}_createCharityLogosCollection`]?.charityLogos?.[0]?.workdayID?.id;
  if (!logoId) throw new Error('Logo upload succeeded but no logo id was returned.');

  await cacheLogoFromFile(logoId, file);
  await persistLogoToDevCache(logoId, file);

  return logoId;
}

export async function deleteCharityLogo(logoId: string, idType = 'WID'): Promise<void> {
  const query = `mutation { ${REFERENCE_ID}_deleteCharityLogo(charityLogosId: { id: ${JSON.stringify(logoId)}, type: ${JSON.stringify(idType)} }) { workdayID { id type } } } }`;

  const response = await fetch(graphqlUrl(), {
    method: 'POST',
    headers: { ...requestHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
    credentials: 'include',
  });

  await parseGraphQLResponse<Record<string, unknown>>(response);
}

export async function fetchCharityLogoBlob(logoId: string, fileName?: string): Promise<Blob> {
  const dataUrl = await resolveCharityLogoSrc(logoId, fileName);
  if (!dataUrl) {
    throw new Error(
      'Logo image is not available in the local viewer. Upload or replace the logo in Edit mode to preview it here.'
    );
  }
  const response = await fetch(dataUrl);
  return response.blob();
}
