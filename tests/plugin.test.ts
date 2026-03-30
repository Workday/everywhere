import { describe, it, expect } from 'vitest';
import type { ComponentType } from 'react';
import { plugin } from '../src/plugin.js';

describe('plugin()', () => {
  it('returns an object when called with no arguments', () => {
    const result = plugin();

    expect(result).toBeDefined();
  });

  it('returns an object when called with an empty config', () => {
    const result = plugin({});

    expect(result).toBeDefined();
  });

  describe('pages', () => {
    it('returns the provided pages', () => {
      const TestPage: ComponentType = () => null;
      const pages = [{ id: 'home', title: 'Home', component: TestPage }];
      const result = plugin({ pages });

      expect(result.pages).toEqual(pages);
    });

    describe('when omitted', () => {
      it('defaults to an empty array', () => {
        const result = plugin();

        expect(result.pages).toEqual([]);
      });
    });
  });

  describe('provider', () => {
    it('returns the provided provider', () => {
      const TestProvider: ComponentType<{ children: React.ReactNode }> = ({ children }) =>
        children as React.ReactElement;
      const result = plugin({ provider: TestProvider });

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

      expect(Object.keys(result)).toEqual(['pages', 'provider']);
    });
  });
});
