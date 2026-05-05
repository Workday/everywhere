import chalk from 'chalk';
import { Flags } from '@oclif/core';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { fileURLToPath } from 'node:url';

import EverywhereBaseCommand from '../../lib/command.js';
import { renderStub } from '../../init-template.js';

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
// init.ts compiles to cli/dist/commands/everywhere/init.js, so the SDK's root
// package.json is four levels up. Both dev and published layouts match.
const SDK_PKG_PATH = path.resolve(THIS_DIR, '../../../../package.json');

function getSdkVersion(): string {
  const pkg = JSON.parse(fs.readFileSync(SDK_PKG_PATH, 'utf-8')) as { version: string };
  return pkg.version;
}

export function promptYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  return new Promise<boolean>((resolve) => {
    rl.question(`${question} [Y/n] `, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === '' || normalized === 'y' || normalized === 'yes');
    });
  });
}

export function runNpmInit(cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['init'], {
      cwd,
      stdio: 'inherit',
      shell: true,
    });
    child.on('error', (err) => {
      reject(new Error(`Failed to start npm init: ${err.message}`));
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm init failed with exit code ${code}`));
      }
    });
  });
}

export function runNpmInstall(cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['install'], {
      cwd,
      stdio: 'inherit',
      shell: true,
    });
    child.on('error', (err) => {
      reject(new Error(`Failed to start npm install: ${err.message}`));
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm install failed with exit code ${code}`));
      }
    });
  });
}

export default class InitCommand extends EverywhereBaseCommand {
  static description = 'Scaffold a stub Workday Everywhere plugin in an existing npm project.';

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
    title: Flags.string({
      char: 'T',
      description: 'Human-friendly display name for the plugin.',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(InitCommand);
    const pluginDir = await this.parsePluginDir();
    const verbose = flags.verbose;
    const title = flags.title;

    // Pre-check 1: package.json exists
    const pkgPath = path.join(pluginDir, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      const confirmed = await promptYesNo('No package.json found. Would you like to run npm init?');
      if (!confirmed) {
        this.log('Run `npm init` first, then re-run `we init`.');
        return;
      }
      await runNpmInit(pluginDir);
    }

    // Pre-check 2: package.json parses and has a name
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
      name?: string;
      version?: string;
      title?: string;
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
    if (added.length > 0 || title) {
      const newPkg = { ...pkg, dependencies: { ...existingDeps } };
      for (const { name, version } of added) {
        newPkg.dependencies[name] = version;
      }
      if (title) {
        newPkg.title = title;
      }
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

    // Run npm install
    this.log('Installing dependencies...');
    await runNpmInstall(pluginDir);
  }
}
