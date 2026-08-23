import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export const baseConfig = tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'src/generated/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
    },
  },
);
