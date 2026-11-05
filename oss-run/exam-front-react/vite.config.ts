import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * §4.3 / §14：环境相关地址一律来自环境变量，业务代码不写死服务地址。
 * 开发态代理目标允许通过 `YJ_DEV_PROXY` 覆盖，避免多人协作时改配置文件。
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.YJ_DEV_PROXY || 'http://127.0.0.1:8090';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        [env.VITE_API_BASE_URL || '/yjapi']: { target, changeOrigin: true },
        [env.VITE_SSO_BASE_URL || '/sso']: { target, changeOrigin: true },
        [env.VITE_FILE_BASE_URL || '/files']: { target, changeOrigin: true }
      }
    },
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 2048,
      /* §14 生产环境不输出调试信息 */
      minify: mode === 'production' ? 'esbuild' : false,
      sourcemap: mode !== 'production'
    }
  };
});
