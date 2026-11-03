import { afterEach, describe, expect, it } from 'vitest';
import { FONT_STYLESHEET_PATH, fontStylesheetUrl, sharedFonts } from './fonts.js';

afterEach(() => {
  delete process.env.NEWMAYBE_FONTS_ORIGIN;
});

describe('fontStylesheetUrl', () => {
  it('points production builds at the main site and dev servers at the main dev server', () => {
    expect(fontStylesheetUrl()).toBe(`https://newmaybe.com${FONT_STYLESHEET_PATH}`);
    expect(fontStylesheetUrl({ dev: true })).toBe(`http://localhost:4321${FONT_STYLESHEET_PATH}`);
  });

  it('lets a build override the main site origin', () => {
    process.env.NEWMAYBE_FONTS_ORIGIN = 'http://127.0.0.1:4401/';
    expect(fontStylesheetUrl()).toBe(`http://127.0.0.1:4401${FONT_STYLESHEET_PATH}`);
  });
});

describe('sharedFonts', () => {
  it('injects a CORS preconnect and stylesheet for the shared fonts', () => {
    const plugin = sharedFonts() as unknown as {
      configResolved: (config: { command: string }) => void;
      transformIndexHtml: () => { tag: string; attrs: Record<string, unknown> }[];
    };
    plugin.configResolved({ command: 'build' });
    expect(plugin.transformIndexHtml().map((tag) => tag.attrs)).toEqual([
      { rel: 'preconnect', href: 'https://newmaybe.com', crossorigin: true },
      { rel: 'stylesheet', href: `https://newmaybe.com${FONT_STYLESHEET_PATH}`, crossorigin: true },
    ]);
  });
});
