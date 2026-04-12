import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const cwd = process.cwd();
  const env = loadEnv(mode, cwd, '');
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(cwd, './'),
      },
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY || "")
    },
    server: {
      port: 3000,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            charts: ['react-window', 'react-virtualized-auto-sizer'],
            visuals: ['lucide-react', 'html2canvas'],
            ai: ['@google/genai']
          }
        }
      }
    },
  };
});
