import type { editor } from 'monaco-editor'

const SCROLLBAR = {
  vertical: 'auto',
  horizontal: 'auto',
  verticalScrollbarSize: 10,
  horizontalScrollbarSize: 10,
  alwaysConsumeMouseWheel: false,
} as const satisfies editor.IEditorScrollbarOptions

/**
 * Single source of truth for the main editor. Suggestions and code lens stay off:
 * this is a document scratchpad, not an IDE, and the noise gets in the way.
 */
export const CODE_EDITOR_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 13,
  lineHeight: 20,
  // Nested String Fold markers are rendered here, left of the line numbers.
  glyphMargin: true,
  lineNumbersMinChars: 3,
  // Ours replaces it; see components/editor-context-menu.tsx. Monaco still
  // fixes the selection on right-click, which is exactly what we want.
  contextmenu: false,
  folding: true,
  padding: { top: 10, bottom: 10 },
  renderLineHighlight: 'all',
  smoothScrolling: true,
  scrollbar: SCROLLBAR,
  matchBrackets: 'always',
  autoClosingBrackets: 'always',
  autoClosingQuotes: 'always',
  autoIndent: 'full',
  formatOnPaste: false,
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  parameterHints: { enabled: false },
  occurrencesHighlight: 'off',
  selectionHighlight: false,
  codeLens: false,
}

export const DIFF_EDITOR_OPTIONS: editor.IDiffEditorConstructionOptions = {
  automaticLayout: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 13,
  lineHeight: 20,
  originalEditable: true,
  renderSideBySide: true,
  // Monaco flips to a single inline pane when the widget is narrow, and while it
  // thinks it is inline it force-disables word wrap on the left pane only — so
  // the two sides end up wrapping differently. Pin side-by-side instead.
  useInlineViewWhenSpaceIsLimited: false,
  renderOverviewRuler: false,
  ignoreTrimWhitespace: false,
  scrollbar: SCROLLBAR,
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  codeLens: false,
  contextmenu: false,
}

/** Read-only preview used by the query result dialog. */
export const RESULT_EDITOR_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  ...CODE_EDITOR_OPTIONS,
  readOnly: true,
  wordWrap: 'on',
  lineNumbers: 'off',
  glyphMargin: false,
}
