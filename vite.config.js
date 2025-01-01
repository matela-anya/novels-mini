import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'

// Загружаем переменные из .env
dotenv.config()

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.APP_URL || 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  define: {
    'process.env.TELEGRAM_BOT_TOKEN': JSON.stringify(process.env.TELEGRAM_BOT_TOKEN),
    'process.env.APP_URL': JSON.stringify(process.env.APP_URL)
  }
})
