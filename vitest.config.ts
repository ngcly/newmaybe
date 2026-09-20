import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'astro:content': path.resolve(__dirname, 'apps/main/src/__mocks__/astro-content.ts'),
    },
  },
  test: {
    include: [
      'packages/**/*.test.ts',
      'apps/main/src/**/*.test.ts',
      'apps/ai/src/**/*.test.ts',
      'apps/study/src/**/*.test.ts',
      'apps/graph/src/**/*.test.ts',
      'apps/club/src/**/*.test.ts',
      'scripts/**/*.test.ts',
    ],
  },
});
