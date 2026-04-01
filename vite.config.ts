import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/dark-forest-star/',
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, './src/core'),
      '@phaser': path.resolve(__dirname, './src/phaser'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
  server: {
    open: true,
  },
});
