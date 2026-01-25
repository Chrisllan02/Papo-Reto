import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente. O terceiro parâmetro '' carrega tudo, independente do prefixo VITE_
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Garante que a API_KEY seja lida do processo (Netlify) ou do arquivo .env (Local)
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY)
    },
    server: {
      port: 3000,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});