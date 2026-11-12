import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@sharon/shared': path.resolve(
        __dirname,
        '../../packages/shared/src/index.ts',
      ),
    },
  },
  server: {
    port: 5174,
    host: true,
  },
  preview: {
    port: 4174,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-socket': [
            '@tanstack/react-query',
            'socket.io-client',
            'axios',
            'zustand',
          ],
          antd: ['antd', '@ant-design/icons'],
          qrcode: ['qrcode'],
        },
      },
    },
  },
});
