/// <reference types="vite/client" />

// The editor core without the bundled languages. It exports the same API as the
// package root; see `components/monaco/monaco-json.ts`.
declare module 'monaco-editor/esm/vs/editor/edcore.main' {
  export * from 'monaco-editor'
}
