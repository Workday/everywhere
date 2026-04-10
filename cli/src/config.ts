import * as fs from 'node:fs';
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
