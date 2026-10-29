import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const cwd = process.cwd();
  const apiProxyTarget = loadEnv(mode, cwd, '').DEV_API_PROXY_TARGET;
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(cwd, './'),
      },
    },
    server: {
      port: 3000,
      proxy: apiProxyTarget
        ? { '/api': { target: apiProxyTarget, changeOrigin: true, secure: true } }
        : undefined,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
          output: {
            manualChunks: {
              react: ['react', 'react-dom'],
              'virtual-list': ['react-window', 'react-virtualized-auto-sizer'],
              visuals: ['lucide-react', 'html2canvas'],
            }
          }
      }
    },
  };
});
