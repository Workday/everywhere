import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { loadBusinessObjects } from '../../../src/commands/everywhere/business-objects.js';

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

  describe('when the model directory has no .businessobject files', () => {
    it('throws an error naming the empty model directory', () => {
      const modelDir = path.join(tmpDir, 'model');
      fs.mkdirSync(modelDir);
      fs.writeFileSync(path.join(modelDir, 'README.md'), 'not a business object');

      expect(() => loadBusinessObjects(tmpDir)).toThrow(
        `No .businessobject files found in ${modelDir}`
      );
    });
  });

  describe('when the model directory has mixed files', () => {
    it('returns only the .businessobject entries', () => {
      const modelDir = path.join(tmpDir, 'model');
      fs.mkdirSync(modelDir);
      fs.writeFileSync(path.join(modelDir, 'Foo.businessobject'), '{"name":"Foo"}');
      fs.writeFileSync(path.join(modelDir, 'README.md'), 'not a business object');

      const result = loadBusinessObjects(tmpDir);

      expect(result).toEqual([{ name: 'Foo.businessobject', content: '{"name":"Foo"}' }]);
    });
  });

  describe('when the model directory contains .businessobject files', () => {
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
});
