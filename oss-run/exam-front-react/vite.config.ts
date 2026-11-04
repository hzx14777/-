import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// §4.3：服务地址一律来自环境变量，不在业务代码中写死
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/yjapi': { target: 'http://127.0.0.1:8090', changeOrigin: true },
      '/sso': { target: 'http://127.0.0.1:8090', changeOrigin: true }
    }
  },
  build: { outDir: 'dist', chunkSizeWarningLimit: 2048 }
}));
