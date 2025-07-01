// COPIE E COLE ESTE CÓDIGO EXATAMENTE COMO ESTÁ
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  root: 'src',
  build: {
    outDir: '../dist/frontend',
    emptyOutDir: true,
  },
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['**/*.spec.ts'],
    reporters: ['default'],
  },
  define: {
    'import.meta.vitest': mode !== 'production',
  },
  // CONFIGURAÇÃO CORRETA DO SERVIDOR E PROXY
  server: {
    port: 4200, // Frontend roda aqui
    proxy: {
      // Redireciona /api para o backend na porta 3000
      '/api': {
        target: 'http://localhost:3000', // <-- O endereço do seu backend
        secure: false,
        changeOrigin: true,
      },
    },
  },
}));
