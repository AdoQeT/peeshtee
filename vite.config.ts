import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-mqtt': ['mqtt'],
          'vendor-confetti': ['canvas-confetti']
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
})
