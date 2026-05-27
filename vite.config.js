import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // 🎯 올바른 최신 플러그인 이름으로 수정!

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 프론트엔드의 /api 요청을 5000번 백엔드로 토스하는 안전 통로
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})