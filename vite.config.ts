import path from "path"

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // 只保留需要的语言支持
          if (id.includes('monaco-editor')) {
            // JSON语言支持
            if (id.includes('json')) {
              return 'json-lang'
            }
            // 基础编辑器
            if (id.includes('editor') || id.includes('core')) {
              return 'monaco-core'
            }
            // 排除不需要的语言
            if (id.includes('language') && !id.includes('json')) {
              return 'unused-lang'
            }
          }
          // React相关
          if (id.includes('react') || id.includes('react-dom')) {
            return 'vendor'
          }
          // UI组件
          if (id.includes('@radix-ui')) {
            return 'ui'
          }
          // 其他依赖
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    }
  }
})
