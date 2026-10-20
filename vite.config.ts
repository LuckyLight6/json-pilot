import path from 'path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export const vendorChunkForModule = (id: string): string | undefined => {
  const normalizedId = id.replaceAll('\\', '/')
  const dependencyRoot = '/node_modules/'

  // Vite's dynamic-import helper. Left unassigned, Rollup files it inside the
  // first chunk that needs it — Monaco, which lazy-loads its JSON mode — and
  // every entry's `import()` then statically depends on the 3 MB editor.
  if (normalizedId.includes('vite/preload-helper')) return 'runtime'

  if (!normalizedId.includes(dependencyRoot)) return undefined

  // Monaco dominates the bundle; isolating it keeps the editor's one large,
  // rarely-changing asset cacheable across app releases.
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

  // Everything else is left to Rollup, which groups dependencies by the
  // entries that import them. A single catch-all `vendor` chunk would make the
  // landing page download the editor's Radix, jsonc and JSONPath code too.
  return undefined
}

// https://vite.dev/config/
export default defineConfig({
  // Relative asset URLs so the build works from any host or sub-path.
  base: './',
  // `/` is the product site, `/app/` the editor. `vite dev` serves both.
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // The bare package only — deep `monaco-editor/esm/...` imports (workers,
      // the slim entry itself) must still reach the real package.
      { find: /^monaco-editor$/, replacement: path.resolve(__dirname, './src/components/monaco/monaco-json.ts') },
    ],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  build: {
    // Monaco is intentionally isolated below and, with only the JSON language
    // and the contributions JSON uses, weighs about 3.1 MB minified (about
    // 810 kB gzip). Keep a tight ceiling around that known editor asset so
    // unrelated bundle growth — or a stray import that drags the full language
    // set back in — shows up.
    chunkSizeWarningLimit: 3200,
    // Read by scripts/service-worker.mjs to list the editor's files, then removed.
    manifest: true,
    // Icons stay files. The logo appears several times on the prerendered
    // site; as a file it downloads once (the favicon already fetches it)
    // instead of riding along as a data URI in every copy. And browsers keep
    // a favicon or touch icon for as long as its URL stays the same, so each
    // needs a fingerprinted URL of its own.
    assetsInlineLimit: (file) =>
      /\/assets\/(icon\.svg|favicon\.ico|apple-touch-icon\.png)$/.test(file) ? false : undefined,
    rollupOptions: {
      input: {
        site: path.resolve(__dirname, 'index.html'),
        app: path.resolve(__dirname, 'app/index.html'),
      },
      output: {
        manualChunks: vendorChunkForModule,
      },
    },
  },
})
