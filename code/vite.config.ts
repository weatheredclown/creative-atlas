import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const jspdfEsmPath = 'jspdf/dist/jspdf.es.min.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBaseUrl = env.VITE_API_BASE_URL?.trim();

  if (mode === 'production' && !apiBaseUrl) {
    throw new Error(
      'VITE_API_BASE_URL is required when building for production. Configure the environment variable or abort the deployment.'
    );
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        jspdf: jspdfEsmPath,
      },
    },
    optimizeDeps: {
      include: ['jspdf'],
    },
    server: {
      proxy: {
        '/api': {
          target: apiBaseUrl || 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
