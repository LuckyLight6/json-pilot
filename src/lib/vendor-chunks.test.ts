import { describe, expect, it } from 'vitest'

import { vendorChunkForModule } from '../../vite.config'

describe('vendorChunkForModule', () => {
  it.each([
    '/workspace/node_modules/react/index.js',
    '/workspace/node_modules/react-dom/client.js',
    '/workspace/node_modules/scheduler/index.js',
    '/workspace/node_modules/.pnpm/react@19.1.0/node_modules/react/index.js',
  ])('groups the core React runtime in the React chunk: %s', (id) => {
    expect(vendorChunkForModule(id)).toBe('react')
  })

  it.each([
    '/workspace/node_modules/@floating-ui/react-dom/dist/index.mjs',
    '/workspace/node_modules/@radix-ui/react-dialog/dist/index.mjs',
    '/workspace/node_modules/react-remove-scroll/dist/es2015/index.js',
    '/workspace/node_modules/zustand/esm/react.mjs',
  ])('does not mistake React consumers for the core runtime: %s', (id) => {
    expect(vendorChunkForModule(id)).toBe('vendor')
  })

  it.each([
    '/workspace/node_modules/monaco-editor/esm/vs/editor/editor.api.js',
    '/workspace/node_modules/@monaco-editor/react/dist/index.mjs',
  ])('keeps Monaco in its isolated chunk: %s', (id) => {
    expect(vendorChunkForModule(id)).toBe('monaco')
  })

  it('leaves application modules to Rollup', () => {
    expect(vendorChunkForModule('/workspace/src/main.tsx')).toBeUndefined()
  })
})
