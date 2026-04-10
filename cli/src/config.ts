import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface ConfigProvider<T> {
  read(): T;
  write(updates: Partial<T>): void;
  readonly path: string;
}

export interface PluginConfig {
  extend?: string;
  install?: string;
}

function createConfig<T>(dir: string, filename: string): ConfigProvider<T> {
  const filePath = path.join(dir, filename);

  return {
    get path(): string {
      return filePath;
    },

    read(): T {
      if (!fs.existsSync(filePath)) {
        return {} as T;
      }
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
    },

    write(updates: Partial<T>): void {
      const dirPath = path.dirname(filePath);
      fs.mkdirSync(dirPath, { recursive: true });
      const existing = this.read();
      const merged = { ...existing, ...updates };
      fs.writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n');
    },
  };
}

let _pluginDir: string | undefined;

export function setPluginDir(dir: string): void {
  _pluginDir = dir;
}

export function pluginConfig(): ConfigProvider<PluginConfig> {
  const dir = _pluginDir ?? process.cwd();
  return createConfig<PluginConfig>(path.join(dir, 'everywhere'), '.config.json');
}

export interface AppConfig {
  auth?: {
    gateway?: string;
    https?: boolean;
    token?: string;
  };
  [key: string]: unknown;
}

export function appConfig(): ConfigProvider<AppConfig> {
  const xdg = process.env['XDG_CONFIG_HOME'];
  const base = xdg ?? path.join(os.homedir(), '.config');
  const dir = path.join(base, '@workday', 'everywhere');
  const inner = createConfig<AppConfig>(dir, 'config.json');

  return {
    get path(): string {
      return inner.path;
    },

    read(): AppConfig {
      return inner.read();
    },

    write(updates: Partial<AppConfig>): void {
      const existing = inner.read();
      const merged: AppConfig = { ...existing, ...updates };
      if (existing.auth && updates.auth) {
        merged.auth = { ...existing.auth, ...updates.auth };
      }
      const dirPath = path.dirname(inner.path);
      fs.mkdirSync(dirPath, { recursive: true });
      fs.writeFileSync(inner.path, JSON.stringify(merged, null, 2) + '\n');
    },
  };
}
