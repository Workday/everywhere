import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

function configDir(): string {
  const xdg = process.env['XDG_CONFIG_HOME'];
  const base = xdg ?? path.join(os.homedir(), '.config');
  return path.join(base, '@workday', 'everywhere');
}

export interface GlobalConfig {
  auth?: {
    gateway?: string;
    https?: boolean;
    token?: string;
  };
  [key: string]: unknown;
}

export function readConfig(): GlobalConfig {
  const configPath = path.join(configDir(), 'config.json');
  if (!fs.existsSync(configPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as GlobalConfig;
}

export function writeConfig(partial: Partial<GlobalConfig>): void {
  const dir = configDir();
  fs.mkdirSync(dir, { recursive: true });
  const existing = readConfig();
  const merged: GlobalConfig = { ...existing, ...partial };
  if (existing.auth && partial.auth) {
    merged.auth = { ...existing.auth, ...partial.auth };
  }
  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(merged, null, 2) + '\n');
}
