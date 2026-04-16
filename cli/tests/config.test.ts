import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { pluginConfig, appConfig, setPluginDir } from '../src/config.js';

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

describe('appConfig', () => {
  let originalXdg: string | undefined;

  beforeEach(() => {
    originalXdg = process.env['XDG_CONFIG_HOME'];
    process.env['XDG_CONFIG_HOME'] = tmpDir;
  });

  afterEach(() => {
    if (originalXdg === undefined) {
      delete process.env['XDG_CONFIG_HOME'];
    } else {
      process.env['XDG_CONFIG_HOME'] = originalXdg;
    }
  });

  describe('read', () => {
    describe('when config file does not exist', () => {
      it('returns an empty object', () => {
        const config = appConfig();
        expect(config.read()).toEqual({});
      });
    });

    describe('when config file exists', () => {
      it('returns the parsed contents', () => {
        const dir = path.join(tmpDir, '@workday', 'everywhere');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(
          path.join(dir, 'config.json'),
          JSON.stringify({ auth: { gateway: 'example.com' } })
        );

        const config = appConfig();
        expect(config.read()).toEqual({ auth: { gateway: 'example.com' } });
      });
    });
  });

  describe('write', () => {
    describe('when config file does not exist', () => {
      it('creates the directory and file', () => {
        const config = appConfig();
        config.write({ auth: { gateway: 'example.com' } });

        expect(fs.existsSync(config.path)).toBe(true);
      });
    });

    describe('when writing unrelated keys', () => {
      it('merges with existing config', () => {
        const config = appConfig();
        config.write({ other: 'value' });
        config.write({ auth: { gateway: 'example.com' } });

        expect(config.read()).toEqual({ other: 'value', auth: { gateway: 'example.com' } });
      });
    });

    describe('when writing to the auth key', () => {
      it('deep-merges the auth object', () => {
        const config = appConfig();
        config.write({ auth: { gateway: 'example.com' } });
        config.write({ auth: { token: 'abc123' } });

        expect(config.read().auth).toEqual({ gateway: 'example.com', token: 'abc123' });
      });
    });
  });

  describe('path', () => {
    it('returns the XDG-based config file path', () => {
      const config = appConfig();
      expect(config.path).toBe(path.join(tmpDir, '@workday', 'everywhere', 'config.json'));
    });
  });
});
