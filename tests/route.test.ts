import { describe, it, expect } from 'vitest';
import type { ComponentType } from 'react';
import { route } from '../src/route.js';

const TestComponent: ComponentType = () => null;

describe('route()', () => {
  describe('when called with an id and config', () => {
    it('returns an object with the id', () => {
      const result = route('home', { component: TestComponent });

      expect(result.id).toBe('home');
    });

    it('returns an object with the component', () => {
      const result = route('home', { component: TestComponent });

      expect(result.component).toBe(TestComponent);
    });

    it('contains only id and component properties', () => {
      const result = route('home', { component: TestComponent });

      expect(Object.keys(result)).toEqual(['id', 'component']);
    });
  });
});
