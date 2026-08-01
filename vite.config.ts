import path from 'path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset URLs so the build works from any sub-path, including the
  // GitHub Pages project site at /json-pilot/.
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  build: {
    // Monaco is intentionally isolated below and currently weighs about
    // 3.9 MB minified (about 1 MB gzip). Keep a tight ceiling around that
    // known editor asset so unrelated bundle growth still remains visible.
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined
          // Monaco dominates the bundle; splitting it lets the shell paint first.
          if (id.includes('monaco-editor')) return 'monaco'
          if (id.includes('/react') || id.includes('/scheduler')) return 'react'
          return 'vendor'
        },
      },
    },
  },
})
