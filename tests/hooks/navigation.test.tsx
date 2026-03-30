import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { FC } from 'react';
import { NavigationProvider, useNavigate, useParams } from '../../src/hooks/index.js';

describe('useParams', () => {
  describe('when no params are set', () => {
    it('returns an empty object', () => {
      let captured: Record<string, string> = { unexpected: 'value' };
      const Test: FC = () => {
        captured = useParams();
        return null;
      };
      renderToStaticMarkup(
        <NavigationProvider>
          <Test />
        </NavigationProvider>
      );

      expect(captured).toEqual({});
    });
  });

  describe('when params are provided via initial state', () => {
    it('returns the params', () => {
      let captured: Record<string, string> = {};
      const Test: FC = () => {
        captured = useParams();
        return null;
      };
      renderToStaticMarkup(
        <NavigationProvider initialView="detail" initialParams={{ id: '42' }}>
          <Test />
        </NavigationProvider>
      );

      expect(captured).toEqual({ id: '42' });
    });
  });
});

describe('useNavigate', () => {
  describe('when called', () => {
    it('returns a function', () => {
      let navigateFn: unknown = null;
      const Test: FC = () => {
        navigateFn = useNavigate();
        return null;
      };
      renderToStaticMarkup(
        <NavigationProvider>
          <Test />
        </NavigationProvider>
      );

      expect(typeof navigateFn).toBe('function');
    });
  });
});
