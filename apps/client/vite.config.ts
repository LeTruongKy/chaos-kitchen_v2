import { defineConfig } from 'vite';
export default defineConfig({
  base: process.env.VITE_BASE_PATH || './',
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:2567',
      '/healthz': 'http://localhost:2567'
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          three: ['three']
        }
      }
    }
  }
});
