// ESLint flat configuration for Kytario Print Customizer.
// Run with: npm run lint:eslint
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier/flat';

export default tseslint.config(
  {
    ignores: ['dist/**', 'dev-dist/**', 'node_modules/**', 'public/**', '*.config.js'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Cloudflare Worker (plain JS) runs in the Workers runtime.
    files: ['cloudflare-worker.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        Response: 'readonly',
        Request: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      'no-undef': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-useless-escape': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // --- Adopted as warnings first (existing code debt) --------------
      // Legacy imports code still uses `any` at untrusted boundaries;
      // step 4 converted the normalization layer, the rest is opt-in cleanup.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Regexes in this project were mostly authored inside string
      // literals with double-escaping; many "useless" escapes are noise.
      'no-useless-escape': 'off',
      'no-useless-assignment': 'off',
      'prefer-const': 'off',
      'no-extra-boolean-cast': 'off',
      // react-hooks v7's stricter runtime rules flag long-standing
      // patterns; keep them visible but non-blocking for now.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      // Real correctness rule - keep as error.
      'no-misleading-character-class': 'error',
      // Web Worker / module patterns legitimately use these.
      'no-case-declarations': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  // Formatting concerns are handled exclusively by Prettier.
  prettierConfig,
);
