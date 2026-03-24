export interface InfoOptions {
  pluginDir: string;
}

export function info(options: InfoOptions): void {
  console.log(`Plugin directory: ${options.pluginDir}`);
}
