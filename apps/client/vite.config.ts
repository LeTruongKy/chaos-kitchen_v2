import { defineConfig } from 'vite';
import { execSync } from 'child_process';

let buildHash = process.env.VITE_BUILD_HASH;
if (!buildHash) {
  try {
    buildHash = execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    buildHash = 'dev';
  }
}

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/chaos-kitchen_v2/" : "/",
  define: {
    global: 'globalThis',
    'import.meta.env.VITE_BUILD_HASH': JSON.stringify(buildHash),
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
}));
