import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Two entry pages: the public landing page at / and the app itself at /app/.
  // Written relative to the project root on purpose. With absolute paths, a project folder
  // named /app (as in the Docker image) made Vite read /app/index.html as /app/app/index.html,
  // so the landing page was silently dropped from the build.
  build: {
    rollupOptions: {
      input: {
        landing: '/index.html',
        app: '/app/index.html',
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
    },
  },
})
