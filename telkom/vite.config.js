import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tw from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // Target proxy hanya dipakai saat `npm run dev`. Di production, /api dilayani nginx/CloudPanel.
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://127.0.0.1:8000';

  return {
    plugins: [react(), tw()],
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        }
      }
    }
  };
});
