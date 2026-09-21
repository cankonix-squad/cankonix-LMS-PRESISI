import base from '@lms/eslint-config';
export default [
  ...base,
  {
    files: ['test/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      // Test doubles return object literals from getters. `this` inside those
      // literals is the literal, not the double, so capturing it in a local is
      // the correct way to reach the shared state — not an accidental alias.
      '@typescript-eslint/no-this-alias': 'off',
    },
    languageOptions: {
      // CommonJS test files run under `node --test`, so these Node globals are
      // genuinely defined at runtime even though `no-undef` cannot infer them.
      globals: {
        Buffer: 'readonly',
        fetch: 'readonly',
        process: 'readonly',
        require: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        exports: 'writable',
      },
    },
  },
];
