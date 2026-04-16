import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 큰 라이브러리들을 별도 청크로 분할
          'recharts': ['recharts'],
          'react-flow': ['@xyflow/react'],
          'vendor': ['zustand', 'react', 'react-dom'],
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        entryFileNames: '[name]-[hash].js',
      },
    },
    chunkSizeWarningLimit: 1000, // 경고 임계값 상향 (임시)
  },
})
