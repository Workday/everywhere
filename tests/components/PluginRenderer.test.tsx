// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, cleanup, render, screen } from '@testing-library/react';
import { useState, type FC } from 'react';
import { PluginRenderer } from '../../src/components/PluginRenderer.js';
import { route } from '../../src/route.js';
import { useNavigate } from '../../src/hooks/useNavigate.js';
import { useParams } from '../../src/hooks/useParams.js';
import type { PluginDefinition } from '../../src/types.js';

const HomePage: FC = () => <div>Home Page</div>;
const SettingsPage: FC = () => <div>Settings Page</div>;

const home = route('home', { component: HomePage });
const settings = route('settings', { component: SettingsPage });

const detail = route<{ id: string }>('detail', {
  component: function DetailPage() {
    const params = useParams(detail);
    return <span data-testid="detail-id">{params.id ?? '(none)'}</span>;
  },
});

const list = route('list', {
  component: function ListPage() {
    const navigate = useNavigate();
    return (
      <button type="button" onClick={() => navigate(detail, { id: '123' })}>
        go-to-detail
      </button>
    );
  },
});

const noop = () => {};

afterEach(cleanup);

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
      const html = renderToStaticMarkup(
        <PluginRenderer plugin={p} routeId="home" params={{}} onNavigate={noop} />
      );

      expect(html).toContain('Home Page');
    });
  });

  describe('when a different route is active', () => {
    it('renders that route instead', () => {
      const p = makePlugin();
      const html = renderToStaticMarkup(
        <PluginRenderer plugin={p} routeId="settings" params={{}} onNavigate={noop} />
      );

      expect(html).toContain('Settings Page');
    });
  });

  describe('when the active route does not exist', () => {
    it('renders a fallback message', () => {
      const p = makePlugin();
      const html = renderToStaticMarkup(
        <PluginRenderer plugin={p} routeId="nonexistent" params={{}} onNavigate={noop} />
      );

      expect(html).toContain('No route found');
    });
  });

  describe('when plugin has a provider', () => {
    it('wraps content in the provider', () => {
      const TestProvider: FC<{ children: React.ReactNode }> = ({ children }) => (
        <div data-testid="provider">{children}</div>
      );
      const p = makePlugin({ provider: TestProvider });
      const html = renderToStaticMarkup(
        <PluginRenderer plugin={p} routeId="home" params={{}} onNavigate={noop} />
      );

      expect(html).toContain('data-testid="provider"');
    });
  });

  describe('when a child navigates to a route with params', () => {
    it('forwards the routeId and params to onNavigate', () => {
      const p: PluginDefinition = { routes: [list, detail], defaultRoute: list };
      const onNavigate = vi.fn();
      render(<PluginRenderer plugin={p} routeId="list" params={{}} onNavigate={onNavigate} />);

      act(() => {
        screen.getByText('go-to-detail').click();
      });

      expect(onNavigate).toHaveBeenCalledWith('detail', { id: '123' });
    });
  });

  describe('when a host wires navigation through controlled props', () => {
    it('exposes the navigated params via useParams on the destination route', () => {
      const p: PluginDefinition = { routes: [list, detail], defaultRoute: list };
      const Harness: FC = () => {
        const [routeId, setRouteId] = useState('list');
        const [params, setParams] = useState<Record<string, string>>({});
        return (
          <PluginRenderer
            plugin={p}
            routeId={routeId}
            params={params}
            onNavigate={(id, p) => {
              setRouteId(id);
              setParams(p);
            }}
          />
        );
      };
      render(<Harness />);

      act(() => {
        screen.getByText('go-to-detail').click();
      });

      expect(screen.getByTestId('detail-id').textContent).toBe('123');
    });
  });

  describe('when the host switches routeId externally after a previous navigate', () => {
    it('does not leak previous-route params back into the same route', () => {
      const p: PluginDefinition = { routes: [list, detail], defaultRoute: list };
      const Harness: FC = () => {
        const [routeId, setRouteId] = useState('list');
        const [params, setParams] = useState<Record<string, string>>({});
        return (
          <>
            <button
              type="button"
              onClick={() => {
                setRouteId('list');
                setParams({});
              }}
            >
              tab-list
            </button>
            <button
              type="button"
              onClick={() => {
                setRouteId('detail');
                setParams({});
              }}
            >
              tab-detail
            </button>
            <PluginRenderer
              plugin={p}
              routeId={routeId}
              params={params}
              onNavigate={(id, p) => {
                setRouteId(id);
                setParams(p);
              }}
            />
          </>
        );
      };
      render(<Harness />);

      act(() => {
        screen.getByText('go-to-detail').click();
      });
      act(() => {
        screen.getByText('tab-list').click();
      });
      act(() => {
        screen.getByText('tab-detail').click();
      });

      expect(screen.getByTestId('detail-id').textContent).toBe('(none)');
    });
  });
});
