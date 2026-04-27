import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { FC } from 'react';
import { route } from '../../src/route.js';
import { NavigationProvider } from '../../src/hooks/NavigationContext.js';
import { useNavigate } from '../../src/hooks/useNavigate.js';
import { useParams } from '../../src/hooks/useParams.js';

const TestComponent: FC = () => null;
const home = route('home', { component: TestComponent });
const employee = route<{ id: string }>('employee', { component: TestComponent });

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

describe('useParams', () => {
  describe('when no params are set', () => {
    it('returns an empty object', () => {
      let captured: Record<string, string> = { unexpected: 'value' };
      const Test: FC = () => {
        captured = useParams(home);
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
});
