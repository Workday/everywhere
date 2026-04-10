import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { readConfig, writeConfig } from '../src/config.js';

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

describe('writeConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'we-config-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('when config file already has data', () => {
    it('merges new keys with existing keys', () => {
      const dir = path.join(tmpDir, 'everywhere');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, '.config.json'), JSON.stringify({ extend: '/app' }));

      writeConfig(tmpDir, { install: '/target' });

      const result = readConfig(tmpDir);
      expect(result).toEqual({ extend: '/app', install: '/target' });
    });
  });

  describe('when config file does not exist', () => {
    it('creates the file with the provided keys', () => {
      writeConfig(tmpDir, { install: '/target' });

      const result = readConfig(tmpDir);
      expect(result).toEqual({ install: '/target' });
    });
  });

  describe('when updating an existing key', () => {
    it('overwrites the old value', () => {
      writeConfig(tmpDir, { install: '/old' });
      writeConfig(tmpDir, { install: '/new' });

      const result = readConfig(tmpDir);
      expect(result).toEqual({ install: '/new' });
    });
  });
});
