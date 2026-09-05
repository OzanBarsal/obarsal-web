import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Mirrors tsconfig.json's "@/*" path so `@/content` resolves under Vitest too.
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, '.') },
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'lib/**/*.test.ts'],
    environment: 'node',
  },
});
