import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'docs/', 'coverage/', 'js/vendor/'] },
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.browser, ...globals.commonjs, Chart: 'readonly' }
    },
    rules: {
      eqeqeq: ['error', 'always']
    }
  },
  {
    files: ['js/App.js', 'js/app/**/*.js'],
    languageOptions: { sourceType: 'module' }
  },
  {
    files: ['js/Validacion.js'],
    languageOptions: {
      globals: { ...globals.node }
    }
  },
  {
    files: ['scripts/avatares-entrada.mjs'],
    languageOptions: { globals: { ...globals.browser } }
  },
  {
    files: ['test/**/*.js', '*.mjs', 'scripts/**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.node }
    }
  }
];
