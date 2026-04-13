import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(() => {
  const cwd = process.cwd();
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(cwd, './'),
      },
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
            }
          }
      }
    },
  };
});
