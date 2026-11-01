import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import type { Plugin } from 'vite'

// The app's pages (/app/banks, /app/transactions/…) are routed in the browser, so any /app/ address
// without a file extension has to open the app itself rather than the landing page.
const appRoutes = (): Plugin => ({
  name: 'app-routes',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const [pathname, query] = (req.url ?? '').split('?')
      if (pathname.startsWith('/app/') && !pathname.includes('.') && !pathname.startsWith('/app/@')) {
        req.url = '/app/index.html' + (query ? `?${query}` : '')
      }
      next()
    })
  },
})

export default defineConfig({
  plugins: [react(), appRoutes()],
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
      output: {
        // Libraries change rarely, so they get their own files and stay cached between deploys
        manualChunks: id => {
          if (!id.includes('node_modules')) return undefined
          if (/recharts|d3-|victory-vendor/.test(id)) return 'charts'
          if (/@tanstack/.test(id)) return 'tanstack'
          if (/xlsx/.test(id)) return 'xlsx'
          if (/react|scheduler/.test(id)) return 'react'
          return undefined
        },
      },
      input: {
        landing: '/index.html',
        app: '/app/index.html',
      },
    },
  },
  server: {
    port: 5173,
    // Lets a tunnel (ngrok) reach the dev server, which Enable Banking's redirect needs over https
    allowedHosts: ['.ngrok-free.app', '.ngrok.app', '.ngrok.io'],
    proxy: {
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
    },
  },
})
