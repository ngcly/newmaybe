import { describe, it, expect } from 'vitest';
import { resolveSubdomain } from '../utils';

describe('resolveSubdomain', () => {
  it('returns original URL when isDev is false', () => {
    expect(resolveSubdomain('https://graph.newmaybe.com/some/path', false)).toBe(
      'https://graph.newmaybe.com/some/path',
    );
    expect(resolveSubdomain('https://newmaybe.com', false)).toBe('https://newmaybe.com');
  });

  it('resolves graph subdomain to localhost:4322', () => {
    expect(resolveSubdomain('https://graph.newmaybe.com', true)).toBe('http://localhost:4322');
  });

  it('resolves tools subdomain to localhost:4323', () => {
    expect(resolveSubdomain('https://tools.newmaybe.com', true)).toBe('http://localhost:4323');
  });

  it('resolves ai subdomain to localhost:4324', () => {
    expect(resolveSubdomain('https://ai.newmaybe.com', true)).toBe('http://localhost:4324');
  });

  it('resolves lab subdomain to localhost:4325', () => {
    expect(resolveSubdomain('https://lab.newmaybe.com', true)).toBe('http://localhost:4325');
  });

  it('resolves studio subdomain to localhost:4326', () => {
    expect(resolveSubdomain('https://studio.newmaybe.com', true)).toBe('http://localhost:4326');
  });

  it('resolves main domain to localhost:4321 (last match)', () => {
    expect(resolveSubdomain('https://newmaybe.com', true)).toBe('http://localhost:4321');
  });

  it('matches domain within longer URLs containing path and query', () => {
    expect(resolveSubdomain('https://ai.newmaybe.com/api/chat?q=hello', true)).toBe(
      'http://localhost:4324/api/chat?q=hello',
    );
  });

  it('returns URL unchanged if no subdomain matches', () => {
    expect(resolveSubdomain('https://example.com', true)).toBe('https://example.com');
  });
});
