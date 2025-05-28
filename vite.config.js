import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { PORTS } from './ports.config.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: PORTS.FRONTEND,
    strictPort: true,
    host: 'localhost',
    hmr: {
      port: PORTS.HMR
    },
    proxy: {
      '/api': {
        target: `http://localhost:${PORTS.BACKEND}`,
        changeOrigin: true,
        secure: false,
        ws: true,
        timeout: 30000
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom']
        }
      }
    }
  },
  preview: {
    port: PORTS.FRONTEND,
    strictPort: true
  }
}) 