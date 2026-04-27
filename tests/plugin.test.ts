import { describe, it, expect } from 'vitest';
import type { ComponentType } from 'react';
import { plugin } from '../src/plugin.js';
import { route } from '../src/route.js';

const TestComponent: ComponentType = () => null;
const home = route('home', { component: TestComponent });

describe('plugin()', () => {
  describe('routes', () => {
    it('returns the provided routes', () => {
      const result = plugin({ routes: [home], defaultRoute: home });

      expect(result.routes).toEqual([home]);
    });

    describe('when omitted', () => {
      it('defaults to an empty array', () => {
        const result = plugin();

        expect(result.routes).toEqual([]);
      });
    });
  });

  describe('defaultRoute', () => {
    it('returns the provided defaultRoute', () => {
      const result = plugin({ routes: [home], defaultRoute: home });

      expect(result.defaultRoute).toBe(home);
    });

    describe('when omitted', () => {
      it('returns undefined', () => {
        const result = plugin();

        expect(result.defaultRoute).toBeUndefined();
      });
    });
  });

  describe('provider', () => {
    it('returns the provided provider', () => {
      const TestProvider: ComponentType<{ children: React.ReactNode }> = ({ children }) =>
        children as React.ReactElement;
      const result = plugin({ provider: TestProvider, routes: [home], defaultRoute: home });

      expect(result.provider).toBe(TestProvider);
    });

    describe('when omitted', () => {
      it('returns undefined', () => {
        const result = plugin();

        expect(result.provider).toBeUndefined();
      });
    });
  });

  describe('returned object shape', () => {
    it('contains only declared properties', () => {
      const result = plugin();

      expect(Object.keys(result)).toEqual(['routes', 'defaultRoute', 'provider']);
    });
  });
});
