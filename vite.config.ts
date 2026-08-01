import path from 'path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export const vendorChunkForModule = (id: string): string | undefined => {
  const normalizedId = id.replaceAll('\\', '/')
  const dependencyRoot = '/node_modules/'

  if (!normalizedId.includes(dependencyRoot)) return undefined

  // Monaco dominates the bundle; splitting it lets the shell paint first.
  if (
    normalizedId.includes(`${dependencyRoot}monaco-editor/`) ||
    normalizedId.includes(`${dependencyRoot}@monaco-editor/react/`)
  ) {
    return 'monaco'
  }

  // Match package directory boundaries. A broad "/react" check also catches
  // React consumers and can force a circular react <-> vendor chunk graph.
  if (
    normalizedId.includes(`${dependencyRoot}react/`) ||
    normalizedId.includes(`${dependencyRoot}react-dom/`) ||
    normalizedId.includes(`${dependencyRoot}scheduler/`)
  ) {
    return 'react'
  }

  return 'vendor'
}

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
        manualChunks: vendorChunkForModule,
      },
    },
  },
})
