import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tw from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tw()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  }
});
