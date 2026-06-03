import { describe, it, expect } from 'vitest';
import { parseGatewayUrl } from '../../src/auth/gateway.js';

describe('parseGatewayUrl', () => {
  describe('when given a valid https URL', () => {
    it('returns the normalized origin', () => {
      expect(parseGatewayUrl('https://api.workday.com')).toBe('https://api.workday.com');
    });
  });

  describe('when given a valid http URL', () => {
    it('returns the normalized origin', () => {
      expect(parseGatewayUrl('http://localhost:8080')).toBe('http://localhost:8080');
    });
  });

  describe('when given a URL with a trailing slash', () => {
    it('strips the trailing slash', () => {
      expect(parseGatewayUrl('https://api.workday.com/')).toBe('https://api.workday.com');
    });
  });

  describe('when given a URL with a path', () => {
    it('drops the path component', () => {
      expect(parseGatewayUrl('https://api.workday.com/some/path')).toBe('https://api.workday.com');
    });
  });

  describe('when given a URL with mixed-case scheme and host', () => {
    it('lowercases the scheme and host', () => {
      expect(parseGatewayUrl('HTTPS://API.Workday.COM')).toBe('https://api.workday.com');
    });
  });

  describe('when given a non-http(s) scheme', () => {
    it('throws an error', () => {
      expect(() => parseGatewayUrl('ftp://api.workday.com')).toThrow(/scheme/i);
    });
  });

  describe('when given a string with no scheme', () => {
    it('throws an error', () => {
      expect(() => parseGatewayUrl('api.workday.com')).toThrow();
    });
  });

  describe('when given a URL with no hostname', () => {
    it('throws an error', () => {
      expect(() => parseGatewayUrl('https://')).toThrow();
    });
  });

  describe('when given an empty string', () => {
    it('throws an error', () => {
      expect(() => parseGatewayUrl('')).toThrow();
    });
  });
});
