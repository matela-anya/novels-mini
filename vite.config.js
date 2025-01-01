import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: process.env.APP_URL || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: !isProduction, // Карты исходного кода только для разработки
      minify: isProduction ? 'esbuild' : false, // Минификация с помощью встроенного esbuild
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'], // Разделение кода
          },
        },
      },
    },
    define: {
      'process.env.TELEGRAM_BOT_TOKEN': JSON.stringify(process.env.TELEGRAM_BOT_TOKEN),
      'process.env.APP_URL': JSON.stringify(process.env.APP_URL),
    },
  };
});
