import type * as Monaco from 'monaco-editor'

/**
 * Monaco themes cut from the app's design tokens (`src/index.css`).
 *
 * The stock `vs-dark` paints #1E1E1E — lighter than the #131313 Raised Surface
 * around it, which inverted the chrome-above-canvas layering and left the
 * active tab (drawn on `--background`) a different colour from the editor it
 * opens onto. These restyle the canvas — background, gutter, line highlight,
 * selection, cursor, widgets — and colour JSON in the GitHub (Primer) palette
 * developers already read fluently: blue keys, green strings, purple numbers,
 * red literals. Every token clears WCAG AA (4.5:1) on its background.
 *
 * Monaco takes hex, not CSS variables, so each value is the sRGB equivalent of
 * the OKLCH token named beside it — keep them in sync when the palette moves.
 * The product site's code samples (`--tok-*` in `src/site/site.css`) mirror the
 * syntax colours.
 */
export const MONACO_THEMES = {
  light: 'json-pilot-light',
  dark: 'json-pilot-dark',
} as const

/** JSON token colours. Monaco matches rules by prefix: `number` covers `number.json`. */
const LIGHT_SYNTAX: Monaco.editor.ITokenThemeRule[] = [
  { token: 'string.key.json', foreground: '0550ae' }, // 7.6:1
  { token: 'string.value.json', foreground: '116329' }, // 7.4:1
  { token: 'number', foreground: '8250df' }, // 5.1:1
  { token: 'keyword.json', foreground: 'cf222e' }, // 5.4:1
  { token: 'delimiter', foreground: '6e7781' }, // 4.6:1
  { token: 'comment', foreground: '6e7781', fontStyle: 'italic' },
]

const DARK_SYNTAX: Monaco.editor.ITokenThemeRule[] = [
  { token: 'string.key.json', foreground: '79c0ff' },
  { token: 'string.value.json', foreground: '7ee787' },
  { token: 'number', foreground: 'd2a8ff' },
  { token: 'keyword.json', foreground: 'ff7b72' },
  { token: 'delimiter', foreground: '8b949e' },
  { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
]

const LIGHT: Monaco.editor.IColors = {
  'editor.foreground': '#1f2328',
  // Nesting depth: blue → purple → green, all from the syntax palette.
  'editorBracketHighlight.foreground1': '#0969da',
  'editorBracketHighlight.foreground2': '#8250df',
  'editorBracketHighlight.foreground3': '#1a7f37',
  'editorBracketHighlight.unexpectedBracket.foreground': '#cf222e',
  // Comparison: translucent GitHub green and red, so the canvas shows through.
  'diffEditor.insertedLineBackground': '#2da44e1f',
  'diffEditor.insertedTextBackground': '#2da44e45',
  'diffEditor.removedLineBackground': '#cf222e17',
  'diffEditor.removedTextBackground': '#cf222e38',
  'diffEditorGutter.insertedLineBackground': '#2da44e2e',
  'diffEditorGutter.removedLineBackground': '#cf222e24',
  'diffEditor.diagonalFill': '#0000000f',
  'editor.background': '#ffffff', // --background
  'editorGutter.background': '#ffffff',
  'editor.lineHighlightBackground': '#f5f5f5', // --muted
  'editor.lineHighlightBorder': '#00000000',
  'editorLineNumber.foreground': '#a1a1a1',
  'editorLineNumber.activeForeground': '#404040',
  'editorCursor.foreground': '#0969da', // --primary
  'editor.selectionBackground': '#0969da2e',
  'editor.inactiveSelectionBackground': '#0969da17',
  'editor.selectionHighlightBackground': '#0969da12',
  'editorBracketMatch.background': '#0969da14',
  'editorBracketMatch.border': '#0969da66',
  'editorIndentGuide.background1': '#e8e8e8', // --border
  'editorIndentGuide.activeBackground1': '#a1a1a1',
  'editorWhitespace.foreground': '#d4d4d4',
  'editorOverviewRuler.border': '#00000000',
  // The matching-bracket pair shows in the ruler as two stray grey ticks.
  'editorOverviewRuler.bracketMatchForeground': '#00000000',
  'scrollbar.shadow': '#00000000', // flat: no inset shadow along scrolled edges
  'editorStickyScroll.background': '#ffffff',
  'editorStickyScroll.shadow': '#0000001a',
  'editorStickyScrollHover.background': '#f5f5f5',
  'editorWidget.background': '#ffffff', // --popover
  'editorWidget.border': '#e8e8e8',
  'editorHoverWidget.background': '#ffffff',
  'editorHoverWidget.border': '#e8e8e8',
  'scrollbarSlider.background': '#1f232829',
  'scrollbarSlider.hoverBackground': '#1f232852',
  'scrollbarSlider.activeBackground': '#1f232866',
  focusBorder: '#0969da99', // --focus-ring
  'list.focusOutline': '#00000000',
  'list.focusAndSelectionOutline': '#00000000'
}

const DARK: Monaco.editor.IColors = {
  'editor.foreground': '#e6edf3',
  'editorBracketHighlight.foreground1': '#58a6ff',
  'editorBracketHighlight.foreground2': '#d2a8ff',
  'editorBracketHighlight.foreground3': '#56d364',
  'editorBracketHighlight.unexpectedBracket.foreground': '#ff7b72',
  'diffEditor.insertedLineBackground': '#2ea04324',
  'diffEditor.insertedTextBackground': '#2ea04366',
  'diffEditor.removedLineBackground': '#f8514921',
  'diffEditor.removedTextBackground': '#f851495c',
  'diffEditorGutter.insertedLineBackground': '#2ea04333',
  'diffEditorGutter.removedLineBackground': '#f851492e',
  'diffEditor.diagonalFill': '#ffffff0f',
  'editor.background': '#0a0a0a', // --background
  'editorGutter.background': '#0a0a0a',
  'editor.lineHighlightBackground': '#171717', // --card
  'editor.lineHighlightBorder': '#00000000',
  'editorLineNumber.foreground': '#525252',
  'editorLineNumber.activeForeground': '#cecece',
  'editorCursor.foreground': '#388bfd', // --ring
  'editor.selectionBackground': '#388bfd40',
  'editor.inactiveSelectionBackground': '#388bfd24',
  'editor.selectionHighlightBackground': '#388bfd1a',
  'editorBracketMatch.background': '#388bfd1f',
  'editorBracketMatch.border': '#388bfd80',
  'editorIndentGuide.background1': '#262626', // --muted
  'editorIndentGuide.activeBackground1': '#525252',
  'editorWhitespace.foreground': '#3a3a3a',
  'editorOverviewRuler.border': '#00000000',
  // The matching-bracket pair shows in the ruler as two stray grey ticks.
  'editorOverviewRuler.bracketMatchForeground': '#00000000',
  'scrollbar.shadow': '#00000000',
  'editorStickyScroll.background': '#0a0a0a',
  'editorStickyScroll.shadow': '#00000099',
  'editorStickyScrollHover.background': '#171717',
  'editorWidget.background': '#171717', // --popover
  'editorWidget.border': '#ffffff1a',
  'editorHoverWidget.background': '#171717',
  'editorHoverWidget.border': '#ffffff1a',
  'scrollbarSlider.background': '#ffffff24',
  'scrollbarSlider.hoverBackground': '#ffffff47',
  'scrollbarSlider.activeBackground': '#ffffff5c',
  focusBorder: '#388bfdb3', // --focus-ring
  'list.focusOutline': '#00000000',
  'list.focusAndSelectionOutline': '#00000000'
}

export function defineMonacoThemes(monaco: typeof Monaco): void {
  monaco.editor.defineTheme(MONACO_THEMES.light, { base: 'vs', inherit: true, rules: LIGHT_SYNTAX, colors: LIGHT })
  monaco.editor.defineTheme(MONACO_THEMES.dark, { base: 'vs-dark', inherit: true, rules: DARK_SYNTAX, colors: DARK })
}
