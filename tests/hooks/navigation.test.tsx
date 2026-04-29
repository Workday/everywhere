import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { FC } from 'react';
import { route } from '../../src/route.js';
import { useNavigate } from '../../src/hooks/useNavigate.js';
import { useParams } from '../../src/hooks/useParams.js';

const TestComponent: FC = () => null;
const home = route('home', { component: TestComponent });

describe('useNavigate', () => {
  describe('when called outside a NavigationContext.Provider', () => {
    it('returns a function (the no-op default)', () => {
      let navigateFn: unknown = null;
      const Test: FC = () => {
        navigateFn = useNavigate();
        return null;
      };
      renderToStaticMarkup(<Test />);

      expect(typeof navigateFn).toBe('function');
    });
  });
});

describe('useParams', () => {
  describe('when no params are set in context', () => {
    it('returns an empty object', () => {
      let captured: Record<string, string> = { unexpected: 'value' };
      const Test: FC = () => {
        captured = useParams(home);
        return null;
      };
      renderToStaticMarkup(<Test />);

      expect(captured).toEqual({});
    });
  });
});
