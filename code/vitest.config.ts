import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    include: [
      'components/__tests__/**/*.{ts,tsx}',
      'utils/__tests__/**/*.{ts,tsx}',
      '**/*.test.{ts,tsx}',
    ],
    coverage: {
      reporter: ['text', 'html'],
    },
    exclude: ['node_modules/**', 'dist/**', 'e2e/**', 'playwright.config.ts'],
  },
});
