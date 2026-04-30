import { describe, it, expect } from 'vitest';
import { renderStub } from '../src/init-template.js';

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
