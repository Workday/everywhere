import { describe, it, expect } from 'vitest';
import InstallCommand from '../../../src/commands/everywhere/install.js';
import EverywhereBaseCommand from '../../../src/lib/command.js';

describe('everywhere install', () => {
  it('exists as a command class', () => {
    expect(InstallCommand).toBeDefined();
  });

  describe('description', () => {
    it('describes building and installing a plugin', () => {
      expect(InstallCommand.description).toBe('Build and install a plugin to a local directory.');
    });
  });

  describe('flags', () => {
    it('inherits the plugin-dir flag from the base command', () => {
      expect(InstallCommand.flags['plugin-dir']).toBe(
        EverywhereBaseCommand.baseFlags['plugin-dir']
      );
    });

    it('defines a path flag for the install target', () => {
      expect(InstallCommand.flags['path']).toBeDefined();
    });
  });
});
