import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { readConfig, writeConfig } from '../src/config.js';

let tmpDir: string;
let originalHome: string | undefined;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'we-config-'));
  originalHome = process.env['XDG_CONFIG_HOME'];
  process.env['XDG_CONFIG_HOME'] = tmpDir;
});

afterEach(() => {
  if (originalHome === undefined) {
    delete process.env['XDG_CONFIG_HOME'];
  } else {
    process.env['XDG_CONFIG_HOME'] = originalHome;
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('readConfig', () => {
  it('returns an empty object when no config file exists', () => {
    expect(readConfig()).toEqual({});
  });

  it('returns parsed contents when the config file exists', () => {
    const dir = path.join(tmpDir, '@workday', 'everywhere');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'config.json'),
      JSON.stringify({ auth: { gateway: 'example.com' } })
    );
    expect(readConfig()).toEqual({ auth: { gateway: 'example.com' } });
  });
});

describe('writeConfig', () => {
  it('creates the directory and file when none exist', () => {
    writeConfig({ auth: { gateway: 'example.com' } });
    const configPath = path.join(tmpDir, '@workday', 'everywhere', 'config.json');
    expect(fs.existsSync(configPath)).toBe(true);
  });

  it('merges with existing config preserving unrelated keys', () => {
    writeConfig({ other: 'value' });
    writeConfig({ auth: { gateway: 'example.com' } });
    const result = readConfig();
    expect(result).toEqual({ other: 'value', auth: { gateway: 'example.com' } });
  });

  it('deep-merges the auth object', () => {
    writeConfig({ auth: { gateway: 'example.com' } });
    writeConfig({ auth: { token: 'abc123' } });
    const result = readConfig();
    expect(result.auth).toEqual({ gateway: 'example.com', token: 'abc123' });
  });
});
