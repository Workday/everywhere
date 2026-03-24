#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { info } from '../dist/index.js';

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    'plugin-dir': { type: 'string', short: 'D' },
  },
  allowPositionals: true,
  strict: false,
});

const pluginDir = resolve(values['plugin-dir'] ?? process.cwd());
const command = positionals[0];

if (command === 'info') {
  info({ pluginDir });
} else {
  console.error(command ? `Unknown command: ${command}` : 'Usage: everywhere <command>');
  console.error('\nCommands:\n  info    Show details for a Workday Everywhere plugin.');
  process.exit(1);
}
