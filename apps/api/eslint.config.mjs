import base from '@lms/eslint-config';
export default [
  ...base,
  {
    files: ['test/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        fetch: 'readonly',
        process: 'readonly',
        require: 'readonly',
      },
    },
  },
];
