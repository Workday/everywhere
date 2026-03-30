import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StyleBoundary } from '../../src/components/StyleBoundary.js';

describe('StyleBoundary', () => {
  describe('when mounted', () => {
    it('renders children', () => {
      const html = renderToStaticMarkup(
        <StyleBoundary>
          <span>hello</span>
        </StyleBoundary>
      );

      expect(html).toContain('<span>hello</span>');
    });

    it('wraps content in a div', () => {
      const html = renderToStaticMarkup(
        <StyleBoundary>
          <span>content</span>
        </StyleBoundary>
      );

      expect(html).toContain('<div><span>content</span></div>');
    });
  });

  describe('when given a provider', () => {
    it('wraps children with the provider component', () => {
      const TestProvider = ({ children }: { children: React.ReactNode }) => (
        <div data-testid="provider">{children}</div>
      );

      const html = renderToStaticMarkup(
        <StyleBoundary provider={TestProvider}>
          <span>hello</span>
        </StyleBoundary>
      );

      expect(html).toContain('data-testid="provider"');
    });
  });

  describe('when no provider is given', () => {
    it('renders children without a provider wrapper', () => {
      const html = renderToStaticMarkup(
        <StyleBoundary>
          <span>hello</span>
        </StyleBoundary>
      );

      expect(html).not.toContain('data-testid="provider"');
    });
  });
});
