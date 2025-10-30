import type { Config } from 'tailwindcss';

const config = {
  content: [
    './index.html',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './contexts/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
    './types.ts',
    './seedData.ts',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;

export default config;
