import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: ['.kaguya.lysz.sorasaku.vip'],
    proxy: {
      '/api': {
        target: 'http://manage.api.kaguya.lysz.sorasaku.vip',
        pathRewrite: { '^/api': '' },
        secure: false,
        changeOrigin: true
      },
      '/days-api': {
        target: 'http://daemon.api.kaguya.lysz.sorasaku.vip:9000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/days-api/, '/days')
      },
      '/quotes-api': {
        target: 'http://daemon.api.kaguya.lysz.sorasaku.vip:9000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/quotes-api/, '/renmin')
      },
      '/config-api': {
        target: 'http://daemon.api.kaguya.lysz.sorasaku.vip:9000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/config-api/, '/config')
      },
      '/notice-api': {
        target: 'http://daemon.api.kaguya.lysz.sorasaku.vip:9000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/notice-api/, '/notice')
      },
      '/picture-api': {
        target: 'http://daemon.api.kaguya.lysz.sorasaku.vip:9000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/picture-api/, '/picture')
      },
      '/video-api': {
        target: 'http://daemon.api.kaguya.lysz.sorasaku.vip:9000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/video-api/, '/video')
      },
      '/device': {
        target: 'http://daemon.api.kaguya.lysz.sorasaku.vip:9000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/device/, '/device')
      }
    }
  }
})
