import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { readPluginManifest } from '../../src/manifest/manifest.js';

describe('readPluginManifest', () => {
  let pluginDir: string;

  beforeEach(() => {
    pluginDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-manifest-'));
  });

  afterEach(() => {
    fs.rmSync(pluginDir, { recursive: true, force: true });
  });

  describe('when package.json is missing', () => {
    it('throws with a missing manifest message', () => {
      expect(() => readPluginManifest(pluginDir)).toThrow(
        'No package.json found in the plugin directory.'
      );
    });
  });

  describe('when package.json contains invalid JSON', () => {
    it('throws with a JSON parse error message', () => {
      fs.writeFileSync(path.join(pluginDir, 'package.json'), 'not valid json { }', 'utf-8');
      expect(() => readPluginManifest(pluginDir)).toThrow('package.json is not valid JSON');
    });
  });

  describe('when the name field is missing', () => {
    it('throws about the missing name field', () => {
      fs.writeFileSync(
        path.join(pluginDir, 'package.json'),
        JSON.stringify({ version: '1.0.0' }),
        'utf-8'
      );
      expect(() => readPluginManifest(pluginDir)).toThrow(
        'package.json is missing required field: name'
      );
    });
  });

  describe('when the name field is not a string', () => {
    it('throws about the non-string name field', () => {
      fs.writeFileSync(
        path.join(pluginDir, 'package.json'),
        JSON.stringify({ name: 42, version: '1.0.0' }),
        'utf-8'
      );
      expect(() => readPluginManifest(pluginDir)).toThrow(
        'package.json is missing required field: name'
      );
    });
  });

  describe('when the version field is missing', () => {
    it('throws about the missing version field', () => {
      fs.writeFileSync(
        path.join(pluginDir, 'package.json'),
        JSON.stringify({ name: 'test-plugin' }),
        'utf-8'
      );
      expect(() => readPluginManifest(pluginDir)).toThrow(
        'package.json is missing required field: version'
      );
    });
  });

  describe('when the version field is not a string', () => {
    it('throws about the non-string version field', () => {
      fs.writeFileSync(
        path.join(pluginDir, 'package.json'),
        JSON.stringify({ name: 'test-plugin', version: 2 }),
        'utf-8'
      );
      expect(() => readPluginManifest(pluginDir)).toThrow(
        'package.json is missing required field: version'
      );
    });
  });

  describe('when the manifest is valid', () => {
    beforeEach(() => {
      fs.writeFileSync(
        path.join(pluginDir, 'package.json'),
        JSON.stringify({ name: 'my-plugin', version: '1.2.3' }),
        'utf-8'
      );
    });

    it('returns the name from the manifest', () => {
      expect(readPluginManifest(pluginDir).name).toBe('my-plugin');
    });

    it('returns the version from the manifest', () => {
      expect(readPluginManifest(pluginDir).version).toBe('1.2.3');
    });
  });

  describe('when the title field is absent', () => {
    beforeEach(() => {
      fs.writeFileSync(
        path.join(pluginDir, 'package.json'),
        JSON.stringify({ name: 'my-plugin', version: '1.2.3' }),
        'utf-8'
      );
    });

    it('returns undefined for title', () => {
      expect(readPluginManifest(pluginDir).title).toBeUndefined();
    });
  });

  describe('when the title field is not a string', () => {
    beforeEach(() => {
      fs.writeFileSync(
        path.join(pluginDir, 'package.json'),
        JSON.stringify({ name: 'my-plugin', version: '1.2.3', title: 42 }),
        'utf-8'
      );
    });

    it('returns undefined for title', () => {
      expect(readPluginManifest(pluginDir).title).toBeUndefined();
    });
  });

  describe('when the title field is an empty string', () => {
    beforeEach(() => {
      fs.writeFileSync(
        path.join(pluginDir, 'package.json'),
        JSON.stringify({ name: 'my-plugin', version: '1.2.3', title: '' }),
        'utf-8'
      );
    });

    it('returns undefined for title', () => {
      expect(readPluginManifest(pluginDir).title).toBeUndefined();
    });
  });

  describe('when the manifest has a title', () => {
    beforeEach(() => {
      fs.writeFileSync(
        path.join(pluginDir, 'package.json'),
        JSON.stringify({ name: 'my-plugin', version: '1.2.3', title: 'My Plugin' }),
        'utf-8'
      );
    });

    it('returns the title from the manifest', () => {
      expect(readPluginManifest(pluginDir).title).toBe('My Plugin');
    });
  });
});
