import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { FC } from 'react';
import { PluginRenderer } from '../../src/components/PluginRenderer.js';
import { route } from '../../src/route.js';
import type { PluginDefinition } from '../../src/types.js';

const HomePage: FC = () => <div>Home Page</div>;
const SettingsPage: FC = () => <div>Settings Page</div>;

const home = route('home', { component: HomePage });
const settings = route('settings', { component: SettingsPage });

function makePlugin(overrides?: Partial<PluginDefinition>): PluginDefinition {
  return {
    routes: [home, settings],
    defaultRoute: home,
    ...overrides,
  };
}

describe('PluginRenderer', () => {
  describe('when the active route exists', () => {
    it('renders the active route component', () => {
      const p = makePlugin();
      const html = renderToStaticMarkup(<PluginRenderer plugin={p} activeRouteId="home" />);

      expect(html).toContain('Home Page');
    });
  });

  describe('when a different route is active', () => {
    it('renders that route instead', () => {
      const p = makePlugin();
      const html = renderToStaticMarkup(<PluginRenderer plugin={p} activeRouteId="settings" />);

      expect(html).toContain('Settings Page');
    });
  });

  describe('when the active route does not exist', () => {
    it('renders a fallback message', () => {
      const p = makePlugin();
      const html = renderToStaticMarkup(<PluginRenderer plugin={p} activeRouteId="nonexistent" />);

      expect(html).toContain('No route found');
    });
  });

  describe('when plugin has a provider', () => {
    it('wraps content in the provider', () => {
      const TestProvider: FC<{ children: React.ReactNode }> = ({ children }) => (
        <div data-testid="provider">{children}</div>
      );
      const p = makePlugin({ provider: TestProvider });
      const html = renderToStaticMarkup(<PluginRenderer plugin={p} activeRouteId="home" />);

      expect(html).toContain('data-testid="provider"');
    });
  });

  describe('when onNavigate is provided', () => {
    it('does not throw during render', () => {
      const p = makePlugin();
      const onNavigate = vi.fn();

      expect(() =>
        renderToStaticMarkup(
          <PluginRenderer plugin={p} activeRouteId="home" onNavigate={onNavigate} />
        )
      ).not.toThrow();
    });
  });
});
