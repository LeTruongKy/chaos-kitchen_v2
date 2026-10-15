import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  noExternal: ['@kitchen/core'],
  target: 'node20',
  clean: true
});
