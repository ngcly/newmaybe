import type { Plugin } from 'vite';

export const FONT_VERSION: string;
export const FONT_STYLESHEET_PATH: string;
export function fontStylesheetUrl(options?: { dev?: boolean }): string;
export function sharedFonts(): Plugin;
