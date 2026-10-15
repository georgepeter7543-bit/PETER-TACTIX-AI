import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // All /api/* requests forwarded to the Express backend on :5000
      '/api': {
        target:      'http://localhost:5000',
        changeOrigin: true,
        secure:      false,
        // Give the backend up to 60 s to respond (covers slow Gemini calls)
        timeout:        60_000,
        proxyTimeout:   60_000,
        // Log every proxied request so you can see it in the Vite terminal
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log(`[Vite proxy] ▶ ${req.method} ${req.url}  →  http://localhost:5000${req.url}`)
          })
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log(`[Vite proxy] ◀ ${proxyRes.statusCode} ${req.method} ${req.url}`)
          })
          proxy.on('error', (err, req, res) => {
            console.error(`[Vite proxy] ✗ Error proxying ${req.method} ${req.url}:`, err.message)
            // Return a structured JSON error instead of Vite's HTML error page
            if (res && !res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({
                error: `Backend unreachable — make sure the server is running on port 5000. (${err.message})`
              }))
            }
          })
        },
      },
    },
  },
})
