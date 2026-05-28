import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderStub, renderTsConfig } from '../src/init-template.js';

const TEMPLATE_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src/agents.template.md'
);

describe('renderStub', () => {
  describe('when called with a name', () => {
    it('returns a string', () => {
      expect(typeof renderStub('my-plugin')).toBe('string');
    });
  });

  describe('when called with a typical npm name', () => {
    it('interpolates the name into the welcome heading', () => {
      expect(renderStub('my-plugin')).toContain('<h1>Welcome to my-plugin!</h1>');
    });
  });

  describe('when called with a scoped name', () => {
    it('interpolates the scoped name verbatim', () => {
      expect(renderStub('@workday/my-plugin')).toContain('<h1>Welcome to @workday/my-plugin!</h1>');
    });
  });

  describe('regardless of name', () => {
    it('imports plugin and route from @workday/everywhere', () => {
      expect(renderStub('anything')).toContain(
        "import { plugin, route } from '@workday/everywhere';"
      );
    });

    it('defines a home route using route()', () => {
      const result = renderStub('anything');
      expect(result).toContain("const home = route('home', { component: HomePage });");
    });

    it('calls plugin() with routes and defaultRoute', () => {
      const result = renderStub('anything');
      expect(result).toContain('defaultRoute: home,');
    });

    it('ends with a single newline', () => {
      expect(renderStub('anything').endsWith('\n')).toBe(true);
    });
  });
});

describe('renderTsConfig', () => {
  describe('when called', () => {
    it('returns a string', () => {
      expect(typeof renderTsConfig()).toBe('string');
    });

    it('returns valid JSON', () => {
      expect(() => JSON.parse(renderTsConfig())).not.toThrow();
    });

    it('ends with a single newline', () => {
      expect(renderTsConfig().endsWith('\n')).toBe(true);
    });
  });

  describe('compilerOptions', () => {
    it('sets target to ES2020', () => {
      const config = JSON.parse(renderTsConfig()) as { compilerOptions: Record<string, unknown> };
      expect(config.compilerOptions.target).toBe('ES2020');
    });

    it('sets jsx to react-jsx', () => {
      const config = JSON.parse(renderTsConfig()) as { compilerOptions: Record<string, unknown> };
      expect(config.compilerOptions.jsx).toBe('react-jsx');
    });

    it('sets moduleResolution to bundler', () => {
      const config = JSON.parse(renderTsConfig()) as { compilerOptions: Record<string, unknown> };
      expect(config.compilerOptions.moduleResolution).toBe('bundler');
    });

    it('enables strict mode', () => {
      const config = JSON.parse(renderTsConfig()) as { compilerOptions: Record<string, unknown> };
      expect(config.compilerOptions.strict).toBe(true);
    });

    it('sets noEmit to true', () => {
      const config = JSON.parse(renderTsConfig()) as { compilerOptions: Record<string, unknown> };
      expect(config.compilerOptions.noEmit).toBe(true);
    });
  });

  describe('include patterns', () => {
    it('includes .ts files', () => {
      const config = JSON.parse(renderTsConfig()) as { include: string[] };
      expect(config.include).toContain('**/*.ts');
    });

    it('includes .tsx files', () => {
      const config = JSON.parse(renderTsConfig()) as { include: string[] };
      expect(config.include).toContain('**/*.tsx');
    });
  });

  describe('exclude patterns', () => {
    it('excludes node_modules', () => {
      const config = JSON.parse(renderTsConfig()) as { exclude: string[] };
      expect(config.exclude).toContain('node_modules');
    });
  });
});

describe('agents.template.md', () => {
  let content: string;

  describe('when read from disk', () => {
    it('exists', () => {
      expect(fs.existsSync(TEMPLATE_PATH)).toBe(true);
    });

    it('ends with a newline', () => {
      content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
      expect(content.endsWith('\n')).toBe(true);
    });
  });

  describe('project context', () => {
    it('identifies this as a Workday Everywhere plugin project', () => {
      content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
      expect(content).toContain('Workday Everywhere');
    });

    it('names the entry point file', () => {
      content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
      expect(content).toContain('plugin.tsx');
    });
  });

  describe('data provider guidance', () => {
    it('mentions DataProvider', () => {
      content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
      expect(content).toContain('DataProvider');
    });

    it('mentions DataResolver', () => {
      content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
      expect(content).toContain('DataResolver');
    });
  });

  describe('peer dependency guidance', () => {
    it('mentions react as a peer dependency', () => {
      content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
      expect(content.toLowerCase()).toContain('peer');
    });

    it('mentions react', () => {
      content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
      expect(content).toContain('react');
    });
  });

  describe('import convention guidance', () => {
    it('calls out the .js extension requirement', () => {
      content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
      expect(content).toContain('.js');
    });
  });

  describe('example references', () => {
    it('links to the hello example', () => {
      content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
      expect(content).toContain('examples/hello');
    });

    it('links to the directory example', () => {
      content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
      expect(content).toContain('examples/directory');
    });
  });
});
