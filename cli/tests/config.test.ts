import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { readConfig } from '../src/config.js';

describe('readConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'we-config-'));
    fs.mkdirSync(path.join(tmpDir, 'everywhere'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('when config file exists', () => {
    it('returns the parsed contents', () => {
      const configPath = path.join(tmpDir, 'everywhere', '.config.json');
      fs.writeFileSync(configPath, JSON.stringify({ extend: '/some/path' }));

      const result = readConfig(tmpDir);
      expect(result).toEqual({ extend: '/some/path' });
    });
  });

  describe('when config file does not exist', () => {
    it('returns an empty object', () => {
      const result = readConfig(tmpDir);
      expect(result).toEqual({});
    });
  });
});
