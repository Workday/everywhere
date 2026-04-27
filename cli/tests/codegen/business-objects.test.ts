import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import JSZip from 'jszip';
import {
  loadBusinessObjects,
  loadBusinessObjectsFromZip,
} from '../../src/codegen/business-objects.js';

describe('loadBusinessObjects', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'we-bo-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('when the model directory does not exist', () => {
    it('throws an error naming the missing directory', () => {
      expect(() => loadBusinessObjects(tmpDir)).toThrow(`No model/ directory found in ${tmpDir}`);
    });
  });

  describe('when the model directory has no model artifacts', () => {
    it('throws an error naming the empty model directory', () => {
      const modelDir = path.join(tmpDir, 'model');
      fs.mkdirSync(modelDir);
      fs.writeFileSync(path.join(modelDir, 'README.md'), 'not a business object');

      expect(() => loadBusinessObjects(tmpDir)).toThrow(
        `No model artifacts (.businessobject, .attachment) found in ${modelDir}`
      );
    });
  });

  describe('when the model directory has mixed files', () => {
    it('returns .businessobject and .attachment entries, ignoring others', () => {
      const modelDir = path.join(tmpDir, 'model');
      fs.mkdirSync(modelDir);
      fs.writeFileSync(path.join(modelDir, 'Foo.businessobject'), '{"name":"Foo"}');
      fs.writeFileSync(path.join(modelDir, 'FooImage.attachment'), '{"name":"FooImage"}');
      fs.writeFileSync(path.join(modelDir, 'README.md'), 'not a model artifact');

      const result = loadBusinessObjects(tmpDir);

      expect(result).toEqual([
        { name: 'Foo.businessobject', content: '{"name":"Foo"}' },
        { name: 'FooImage.attachment', content: '{"name":"FooImage"}' },
      ]);
    });
  });

  describe('when the model directory contains only .businessobject files', () => {
    it('returns one entry per file with its contents', () => {
      const modelDir = path.join(tmpDir, 'model');
      fs.mkdirSync(modelDir);
      fs.writeFileSync(path.join(modelDir, 'Foo.businessobject'), '{"name":"Foo"}');
      fs.writeFileSync(path.join(modelDir, 'Bar.businessobject'), '{"name":"Bar"}');

      const result = loadBusinessObjects(tmpDir);

      expect(result).toEqual([
        { name: 'Bar.businessobject', content: '{"name":"Bar"}' },
        { name: 'Foo.businessobject', content: '{"name":"Foo"}' },
      ]);
    });
  });

  describe('when the model directory contains .attachment files', () => {
    it('returns attachment entries alongside business objects', () => {
      const modelDir = path.join(tmpDir, 'model');
      fs.mkdirSync(modelDir);
      fs.writeFileSync(path.join(modelDir, 'Charity.businessobject'), '{"name":"Charity"}');
      fs.writeFileSync(path.join(modelDir, 'CharityLogo.attachment'), '{"name":"CharityLogo"}');

      const result = loadBusinessObjects(tmpDir);

      expect(result).toEqual([
        { name: 'Charity.businessobject', content: '{"name":"Charity"}' },
        { name: 'CharityLogo.attachment', content: '{"name":"CharityLogo"}' },
      ]);
    });
  });
});

describe('loadBusinessObjectsFromZip', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'we-bo-zip-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  async function writeZip(zipPath: string, entries: Record<string, string>): Promise<void> {
    const zip = new JSZip();
    for (const [name, content] of Object.entries(entries)) {
      zip.file(name, content);
    }
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(zipPath, buf);
  }

  describe('when the zip contains .businessobject files in model/', () => {
    it('returns one entry per file with its contents', async () => {
      const zipPath = path.join(tmpDir, 'app.zip');
      await writeZip(zipPath, {
        'model/Foo.businessobject': '{"name":"Foo"}',
        'model/Bar.businessobject': '{"name":"Bar"}',
      });

      const result = await loadBusinessObjectsFromZip(zipPath);

      expect(result).toEqual([
        { name: 'Bar.businessobject', content: '{"name":"Bar"}' },
        { name: 'Foo.businessobject', content: '{"name":"Foo"}' },
      ]);
    });
  });

  describe('when the zip contains .attachment files in model/', () => {
    it('returns attachment entries alongside business objects', async () => {
      const zipPath = path.join(tmpDir, 'app.zip');
      await writeZip(zipPath, {
        'model/Charity.businessobject': '{"name":"Charity"}',
        'model/CharityLogo.attachment': '{"name":"CharityLogo"}',
      });

      const result = await loadBusinessObjectsFromZip(zipPath);

      expect(result).toEqual([
        { name: 'Charity.businessobject', content: '{"name":"Charity"}' },
        { name: 'CharityLogo.attachment', content: '{"name":"CharityLogo"}' },
      ]);
    });
  });

  describe('when the zip has no model/ folder', () => {
    it('throws an error naming the zip path', async () => {
      const zipPath = path.join(tmpDir, 'app.zip');
      await writeZip(zipPath, {
        'README.md': 'no models here',
      });

      await expect(loadBusinessObjectsFromZip(zipPath)).rejects.toThrow(
        `No model/ folder found in ${zipPath}`
      );
    });
  });

  describe('when the zip has a model/ folder but no model artifacts', () => {
    it('throws an error naming the zip path', async () => {
      const zipPath = path.join(tmpDir, 'app.zip');
      await writeZip(zipPath, {
        'model/README.md': 'not a business object',
      });

      await expect(loadBusinessObjectsFromZip(zipPath)).rejects.toThrow(
        `No model artifacts (.businessobject, .attachment) found in ${zipPath}`
      );
    });
  });

  describe('when the zip has mixed files in model/', () => {
    it('returns only .businessobject and .attachment entries', async () => {
      const zipPath = path.join(tmpDir, 'app.zip');
      await writeZip(zipPath, {
        'model/Foo.businessobject': '{"name":"Foo"}',
        'model/FooImage.attachment': '{"name":"FooImage"}',
        'model/README.md': 'not a model artifact',
      });

      const result = await loadBusinessObjectsFromZip(zipPath);

      expect(result).toEqual([
        { name: 'Foo.businessobject', content: '{"name":"Foo"}' },
        { name: 'FooImage.attachment', content: '{"name":"FooImage"}' },
      ]);
    });
  });
});
