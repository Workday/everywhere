#!/usr/bin/env node

import { execute } from '@oclif/core';

const args = ['everywhere', ...process.argv.slice(2)];
await execute({ dir: import.meta.dirname + '/../cli', args });
