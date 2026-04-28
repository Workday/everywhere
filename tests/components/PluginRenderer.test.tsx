import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { FC } from 'react';
import { PluginRenderer } from '../../src/components/PluginRenderer.js';
import type { PluginDefinition } from '../../src/types.js';

const HomePage: FC = () => <div>Home Page</div>;
const SettingsPage: FC = () => <div>Settings Page</div>;

function makePlugin(overrides?: Partial<PluginDefinition>): PluginDefinition {
  return {
    name: 'test-plugin',
    version: '1.0.0',
    pages: [
      { id: 'home', title: 'Home', component: HomePage },
      { id: 'settings', title: 'Settings', component: SettingsPage },
    ],
    ...overrides,
  };
}

describe('PluginRenderer', () => {
  describe('when the active page exists', () => {
    it('renders the active page component', () => {
      const plugin = makePlugin();
      const html = renderToStaticMarkup(<PluginRenderer plugin={plugin} activePageId="home" />);

      expect(html).toContain('Home Page');
    });
  });

  describe('when a different page is active', () => {
    it('renders that page instead', () => {
      const plugin = makePlugin();
      const html = renderToStaticMarkup(<PluginRenderer plugin={plugin} activePageId="settings" />);

      expect(html).toContain('Settings Page');
    });
  });

  describe('when the active page does not exist', () => {
    it('renders a fallback message', () => {
      const plugin = makePlugin();
      const html = renderToStaticMarkup(
        <PluginRenderer plugin={plugin} activePageId="nonexistent" />
      );

      expect(html).toContain('No page found');
    });
  });

  describe('when plugin has a provider', () => {
    it('wraps content in the provider', () => {
      const TestProvider: FC<{ children: React.ReactNode }> = ({ children }) => (
        <div data-testid="provider">{children}</div>
      );

      const plugin = makePlugin({ provider: TestProvider });
      const html = renderToStaticMarkup(<PluginRenderer plugin={plugin} activePageId="home" />);

      expect(html).toContain('data-testid="provider"');
    });
  });

  describe('when onNavigate is provided', () => {
    it('does not throw during render', () => {
      const plugin = makePlugin();
      const onNavigate = vi.fn();

      expect(() =>
        renderToStaticMarkup(
          <PluginRenderer plugin={plugin} activePageId="home" onNavigate={onNavigate} />
        )
      ).not.toThrow();
    });
  });
});
