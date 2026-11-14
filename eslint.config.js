import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: globals.node } },
  {
    files: ['apps/web/src/**/*.{ts,tsx}', 'packages/ui/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    // Le CLI shadcn écrit des imports « @/… » que Vite ne résout pas depuis apps/web.
    files: ['packages/ui/src/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', {
      patterns: [{ group: ['@/*'], message: 'Utiliser un import relatif dans packages/ui.' }],
    }] },
  },
  {
    files: ['packages/mission-core/src/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', {
      patterns: ['react', 'react/*', 'react-dom', 'react-dom/*', 'ol', 'ol/*', '@marps/*'],
    }] },
  },
);
