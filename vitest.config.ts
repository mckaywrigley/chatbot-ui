import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment:'jsdom'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
