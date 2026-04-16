import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import JSZip from 'jszip';

export interface BusinessObjectFile {
  name: string;
  content: string;
}

export async function loadBusinessObjectsFromZip(zipPath: string): Promise<BusinessObjectFile[]> {
  const buffer = await fsp.readFile(zipPath);
  const zip = await JSZip.loadAsync(buffer);

  const entries: BusinessObjectFile[] = [];
  let hasModelFolder = false;

  for (const [entryPath, entry] of Object.entries(zip.files)) {
    if (entryPath.startsWith('model/')) hasModelFolder = true;
    if (entry.dir) continue;

    const match = entryPath.match(/^model\/([^/]+\.businessobject)$/);
    if (!match) continue;

    const content = await entry.async('string');
    entries.push({ name: match[1], content });
  }

  if (!hasModelFolder) {
    throw new Error(`No model/ folder found in ${zipPath}`);
  }

  if (entries.length === 0) {
    throw new Error(`No .businessobject files found in ${zipPath}`);
  }

  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  return entries;
}

export function loadBusinessObjects(appDir: string): BusinessObjectFile[] {
  const modelDir = path.join(appDir, 'model');

  if (!fs.existsSync(modelDir)) {
    throw new Error(`No model/ directory found in ${appDir}`);
  }

  const files = fs.readdirSync(modelDir).filter((f) => f.endsWith('.businessobject'));

  if (files.length === 0) {
    throw new Error(`No .businessobject files found in ${modelDir}`);
  }

  files.sort();

  return files.map((name) => ({
    name,
    content: fs.readFileSync(path.join(modelDir, name), 'utf-8'),
  }));
}
