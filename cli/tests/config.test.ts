import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { pluginConfig, setPluginDir } from '../src/config.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'we-config-'));
  setPluginDir(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('pluginConfig', () => {
  describe('read', () => {
    describe('when config file does not exist', () => {
      it('returns an empty object', () => {
        const config = pluginConfig();
        expect(config.read()).toEqual({});
      });
    });

    describe('when config file exists', () => {
      it('returns the parsed contents', () => {
        const configDir = path.join(tmpDir, 'everywhere');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, '.config.json'),
          JSON.stringify({ extend: '/some/path' })
        );

        const config = pluginConfig();
        expect(config.read()).toEqual({ extend: '/some/path' });
      });
    });
  });

  describe('write', () => {
    describe('when config file does not exist', () => {
      it('creates the file with the provided keys', () => {
        const config = pluginConfig();
        config.write({ install: '/target' });

        expect(config.read()).toEqual({ install: '/target' });
      });
    });

    describe('when config file already has data', () => {
      it('merges new keys with existing keys', () => {
        const config = pluginConfig();
        config.write({ extend: '/app' });
        config.write({ install: '/target' });

        expect(config.read()).toEqual({ extend: '/app', install: '/target' });
      });
    });

    describe('when updating an existing key', () => {
      it('overwrites the old value', () => {
        const config = pluginConfig();
        config.write({ install: '/old' });
        config.write({ install: '/new' });

        expect(config.read()).toEqual({ install: '/new' });
      });
    });
  });

  describe('path', () => {
    it('returns the resolved config file path', () => {
      const config = pluginConfig();
      expect(config.path).toBe(path.join(tmpDir, 'everywhere', '.config.json'));
    });
  });
});
