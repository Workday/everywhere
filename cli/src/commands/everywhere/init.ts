import chalk from 'chalk';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import EverywhereBaseCommand from './base.js';
import { renderStub } from '../../init-template.js';

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
// init.ts compiles to cli/dist/commands/everywhere/init.js, so the SDK's root
// package.json is four levels up. Both dev and published layouts match.
const SDK_PKG_PATH = path.resolve(THIS_DIR, '../../../../package.json');

function getSdkVersion(): string {
  const pkg = JSON.parse(fs.readFileSync(SDK_PKG_PATH, 'utf-8')) as { version: string };
  return pkg.version;
}

export default class InitCommand extends EverywhereBaseCommand {
  static description = 'Scaffold a stub Workday Everywhere plugin in an existing npm project.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(InitCommand);
    const pluginDir = await this.parsePluginDir();
    const verbose = flags.verbose;

    // Pre-check 1: package.json exists
    const pkgPath = path.join(pluginDir, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      this.error(`No package.json found in ${pluginDir}. Run \`npm init\` first.`);
    }

    // Pre-check 2: package.json parses and has a name
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
      name?: string;
      version?: string;
      dependencies?: Record<string, string>;
    };
    if (!pkg.name || typeof pkg.name !== 'string') {
      this.error('package.json must have a "name" field.');
    }

    // Pre-check 3: plugin file doesn't already exist
    const tsxPath = path.join(pluginDir, 'plugin.tsx');
    const tsPath = path.join(pluginDir, 'plugin.ts');
    for (const existing of [tsxPath, tsPath]) {
      if (fs.existsSync(existing)) {
        this.error(
          `Plugin file already exists: ${existing}. Remove it first or run from a fresh directory.`
        );
      }
    }

    // Verbose: announce which package.json we're operating on
    if (verbose) {
      const version = pkg.version ?? 'unknown';
      this.log(`Package: ${pkg.name}@${version} (${chalk.cyan(pkgPath)})`);
    }

    // Compute dep additions vs skipped
    const sdkVersion = getSdkVersion();
    const desiredDeps: Record<string, string> = {
      '@workday/everywhere': `^${sdkVersion}`,
      react: '^19',
      'react-dom': '^19',
    };
    const existingDeps: Record<string, string> = pkg.dependencies ?? {};
    const added: Array<{ name: string; version: string }> = [];
    const skipped: Array<{ name: string; existingVersion: string }> = [];

    for (const [name, version] of Object.entries(desiredDeps)) {
      if (name in existingDeps) {
        skipped.push({ name, existingVersion: existingDeps[name] });
        if (verbose) {
          this.log(
            `Dependency already present: ${name} (keeping ${chalk.dim(existingDeps[name])})`
          );
        }
      } else {
        added.push({ name, version });
        if (verbose) {
          this.log(`Adding dependency: ${name} ${chalk.dim(version)}`);
        }
      }
    }

    // Mutation 1: write package.json if anything was added
    if (added.length > 0) {
      const newDeps = { ...existingDeps };
      for (const { name, version } of added) {
        newDeps[name] = version;
      }
      const newPkg = { ...pkg, dependencies: newDeps };
      fs.writeFileSync(pkgPath, JSON.stringify(newPkg, null, 2) + '\n');
      this.log(chalk.green('Updated package.json'));
    } else if (verbose) {
      this.log('No changes to package.json');
    }

    // Verbose: announce the plugin.tsx write
    if (verbose) {
      this.log(`Writing ${chalk.cyan(tsxPath)}`);
    }

    // Mutation 2: write plugin.tsx
    fs.writeFileSync(tsxPath, renderStub(pkg.name));
    this.log(chalk.green('Created plugin.tsx'));

    // Next-steps hint
    this.log('Run `npm install` to install dependencies.');
  }
}
