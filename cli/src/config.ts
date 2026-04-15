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

type MergeFn<T> = (existing: T, updates: Partial<T>) => T;

function shallowMerge<T>(existing: T, updates: Partial<T>): T {
  return { ...existing, ...updates };
}

function createConfig<T>(
  dir: string,
  filename: string,
  merge: MergeFn<T> = shallowMerge
): ConfigProvider<T> {
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
      const merged = merge(existing, updates);
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

function appMerge(existing: AppConfig, updates: Partial<AppConfig>): AppConfig {
  const merged: AppConfig = { ...existing, ...updates };
  if (existing.auth && updates.auth) {
    merged.auth = { ...existing.auth, ...updates.auth };
  }
  return merged;
}

export function appConfig(): ConfigProvider<AppConfig> {
  const xdg = process.env['XDG_CONFIG_HOME'];
  const base = xdg ?? path.join(os.homedir(), '.config');
  const dir = path.join(base, '@workday', 'everywhere');
  return createConfig<AppConfig>(dir, 'config.json', appMerge);
}
