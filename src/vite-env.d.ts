/// <reference types="vite/client" />

// The editor API without the bundled languages or contributions. It exports the
// same API as the package root; see `components/monaco/monaco-json.ts`.
declare module 'monaco-editor/esm/vs/editor/editor.api' {
  export * from 'monaco-editor'
}
