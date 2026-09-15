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
      // The build is a static export; next/image's optimizer is not part of it.
      '@next/next/no-img-element': 'off',
    },
  },
  {
    ignores: ['.next/**', 'dist/**', '.open-next/**', 'node_modules/**', 'docs/**', '.superpowers/**'],
  },
];

export default config;
