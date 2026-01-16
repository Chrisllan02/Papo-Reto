import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente (como API_KEY)
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Define process.env.API_KEY para funcionar no código do browser
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Fallback para evitar erro de 'process is not defined' em outras bibliotecas
      'process.env': {}
    }
  };
});