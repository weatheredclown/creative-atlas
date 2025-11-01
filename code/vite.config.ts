import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const jspdfEsmPath = 'jspdf/dist/jspdf.es.min.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

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
          target: env.VITE_API_BASE_URL || 'http://localhost:4000',
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
