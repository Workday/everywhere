import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const bin = resolve(import.meta.dirname, '../../bin/everywhere.js');
const root = resolve(import.meta.dirname, '../..');

function run(...args: string[]): string {
  return execFileSync('node', [bin, ...args], {
    cwd: root,
    encoding: 'utf-8',
  });
}

function runExpectError(...args: string[]): string {
  try {
    execFileSync('node', [bin, ...args], {
      cwd: root,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return '';
  } catch (err) {
    const { stdout, stderr } = err as { stdout: string; stderr: string };
    return stdout + stderr;
  }
}

describe('bin/everywhere.js', () => {
  describe('info command', () => {
    it('prints the plugin directory', () => {
      const output = run('info', '-D', root);

      expect(output).toContain(root);
    });
  });

  describe('unknown command', () => {
    it('exits with a non-zero code', () => {
      const output = runExpectError('bogus');

      expect(output).not.toBe('');
    });
  });

  describe('no command', () => {
    it('prints available commands', () => {
      const output = run('--help');

      expect(output).toContain('info');
    });
  });
});
