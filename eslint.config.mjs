import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import astroPlugin from 'eslint-plugin-astro';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettierConfig from 'eslint-config-prettier/flat';

export default [
  // Global ignores
  {
    ignores: [
      '**/dist/**',
      '**/.astro/**',
      '**/node_modules/**',
      '**/.git/**',
      '**/.claude/**',
      '**/.wrangler/**',
      '**/.astro/types.d.ts',
      '**/env.d.ts',
      'src/**',
    ],
  },

  // Base recommended rules for all JS/TS files
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // Astro files
  ...astroPlugin.configs.recommended,

  // React app files — hooks & refresh rules only
  {
    files: ['apps/tools/**/*.{ts,tsx}', 'apps/ai/**/*.{ts,tsx}', 'apps/studio/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // TypeScript files — relaxed rules for an existing codebase
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },

  // JS/JSX files
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },

  // Scripts directory — allow console
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // Astro files — inline scripts have idiomatic empty blocks & ts-ignore
  {
    files: ['**/*.astro', '**/*.astro/**/*.js', '**/*.astro/**/*.ts'],
    rules: {
      'no-empty': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },

  // Prettier — must be last to override all stylistic rules
  prettierConfig,
];
