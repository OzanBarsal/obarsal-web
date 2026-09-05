import next from 'eslint-config-next';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';

const config = [
  ...next,
  ...tseslint.configs.recommended,
  {
    files: ['components/**/*.tsx'],
    plugins: { react },
    rules: {
      // Components never contain copy. Every user-facing string comes from content/.
      'react/jsx-no-literals': ['error', { noStrings: true, ignoreProps: true }],
    },
  },
  {
    ignores: ['.next/**', 'dist/**', '.open-next/**', 'node_modules/**', 'docs/**', '.superpowers/**'],
  },
];

export default config;
