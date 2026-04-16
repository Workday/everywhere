import * as fs from 'node:fs';
import * as path from 'node:path';

export interface BusinessObjectFile {
  name: string;
  content: string;
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
