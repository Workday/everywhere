import { describe, it, expect } from 'vitest';
import { renderStub, renderTsConfig } from '../src/init-template.js';

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
