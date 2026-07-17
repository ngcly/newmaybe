import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'astro:content': path.resolve(__dirname, 'apps/main/src/__mocks__/astro-content.ts'),
    },
  },
  test: {
    include: ['packages/**/*.test.ts', 'apps/main/src/**/*.test.ts'],
  },
});
