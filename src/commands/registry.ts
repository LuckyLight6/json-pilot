import type { MessageKey } from '@/i18n'
import { useEditorStore } from '@/store/editor-store'
import { TOOLBAR_STYLES, usePreferencesStore } from '@/store/preferences-store'
import { THEMES, type Theme } from '@/theme/theme-provider'

export type CommandId =
  | 'document.format'
  | 'document.minify'
  | 'document.escape'
  | 'document.unescape'
  | 'document.sortAscending'
  | 'document.sortDescending'
  | 'document.copy'
  | 'document.clear'
  | 'document.loadSample'
  | 'editor.foldAll'
  | 'editor.unfoldAll'
  | 'editor.goToFirstError'
  | 'view.toggleWordWrap'
  | 'view.cycleToolbarStyle'
  | 'view.cycleTheme'
  | 'tabs.new'
  | 'tabs.newCompare'
  | 'tabs.close'
  | 'tabs.next'
  | 'tabs.previous'
  | 'compare.swapPanes'
  | 'query.focus'
  | 'app.showShortcuts'

export interface CommandDefinition {
  id: CommandId
  labelKey: MessageKey
  /**
   * Portable binding, `Mod` meaning Cmd on macOS and Ctrl elsewhere. Every
   * command ships with one; users can still remove theirs in the dialog.
   *
   * Defaults follow VS Code wherever it has one — `Alt+Shift+F`, `Mod+K Mod+0`,
   * `Alt+Z`, `F8` — since that is the editor JSON Pilot is built on. Where VS
   * Code's key is one browsers reserve for themselves (`Mod+N`, `Mod+W`, tab
   * switching), the default adds `Alt` to the same shape. The remaining
   * JSON-specific actions keep the `Alt+Shift+<letter>` family of Format.
   */
  defaultBinding: string
  run: () => void
}

/** The id of the element the "focus query" command targets. */
export const QUERY_INPUT_ID = 'json-pilot-query-input'

function cycle<T>(values: readonly T[], current: T): T {
  const index = values.indexOf(current)
  return values[(index + 1) % values.length]
}

const editor = () => useEditorStore.getState()
const preferences = () => usePreferencesStore.getState()

/** Set by `ShortcutsDialog` so the command can open it from anywhere. */
let showShortcuts: () => void = () => {}
export function setShortcutsOpener(open: () => void): void {
  showShortcuts = open
}

/** Set by `ClearDocumentDialog`: clearing always asks first, however it is invoked. */
let requestClearImpl: () => void = () => {}
export function setClearRequester(request: () => void): void {
  requestClearImpl = request
}
export function requestClear(): void {
  requestClearImpl()
}

/** Set by `ThemeProvider`'s consumer — the theme lives in React context. */
let cycleThemeImpl: () => void = () => {}
export function setThemeCycler(current: () => Theme, apply: (theme: Theme) => void): void {
  cycleThemeImpl = () => apply(cycle(THEMES, current()))
}

export const COMMANDS: CommandDefinition[] = [
  { id: 'document.format', labelKey: 'action.format', defaultBinding: 'Alt+Shift+F', run: () => editor().format() },
  { id: 'document.minify', labelKey: 'action.minify', defaultBinding: 'Alt+Shift+M', run: () => editor().minify() },
  { id: 'document.escape', labelKey: 'action.escape', defaultBinding: 'Alt+Shift+E', run: () => editor().escape() },
  { id: 'document.unescape', labelKey: 'action.unescape', defaultBinding: 'Alt+Shift+U', run: () => editor().unescape() },
  {
    id: 'document.sortAscending',
    labelKey: 'action.sortAscending',
    defaultBinding: 'Alt+Shift+S',
    run: () => editor().sortKeys('asc'),
  },
  {
    id: 'document.sortDescending',
    labelKey: 'action.sortDescending',
    defaultBinding: 'Alt+Shift+R',
    run: () => editor().sortKeys('desc'),
  },
  { id: 'document.copy', labelKey: 'action.copyDocument', defaultBinding: 'Alt+Shift+C', run: () => editor().copy() },
  // Safe to bind: clearing always asks first (see ClearDocumentDialog).
  { id: 'document.clear', labelKey: 'action.clear', defaultBinding: 'Alt+Shift+Backspace', run: () => requestClear() },
  {
    id: 'document.loadSample',
    labelKey: 'empty.loadSample',
    defaultBinding: 'Alt+Shift+I',
    run: () => editor().loadSample(),
  },

  { id: 'editor.foldAll', labelKey: 'action.foldAll', defaultBinding: 'Mod+K Mod+0', run: () => editor().foldAll() },
  { id: 'editor.unfoldAll', labelKey: 'action.unfoldAll', defaultBinding: 'Mod+K Mod+J', run: () => editor().unfoldAll() },
  {
    id: 'editor.goToFirstError',
    labelKey: 'status.jumpToError',
    defaultBinding: 'F8',
    run: () => editor().goToFirstError(),
  },

  {
    id: 'view.toggleWordWrap',
    labelKey: 'status.wordWrap',
    defaultBinding: 'Alt+Z',
    run: () => preferences().toggleWordWrap(),
  },
  {
    id: 'view.cycleToolbarStyle',
    labelKey: 'toolbar.style',
    defaultBinding: 'Alt+Shift+B',
    run: () => preferences().setToolbarStyle(cycle(TOOLBAR_STYLES, preferences().toolbarStyle)),
  },
  { id: 'view.cycleTheme', labelKey: 'theme.toggle', defaultBinding: 'Mod+K Mod+T', run: () => cycleThemeImpl() },

  { id: 'tabs.new', labelKey: 'tab.newDocument', defaultBinding: 'Mod+Alt+N', run: () => editor().openDocumentTab() },
  {
    id: 'tabs.newCompare',
    labelKey: 'tab.newCompare',
    defaultBinding: 'Mod+K D',
    run: () => editor().openCompareTab(),
  },
  {
    id: 'tabs.close',
    labelKey: 'tab.close',
    defaultBinding: 'Mod+Alt+W',
    run: () => editor().closeTab(editor().activeTabId),
  },
  { id: 'tabs.next', labelKey: 'tab.next', defaultBinding: 'Mod+Alt+PageDown', run: () => stepTab(1) },
  { id: 'tabs.previous', labelKey: 'tab.previous', defaultBinding: 'Mod+Alt+PageUp', run: () => stepTab(-1) },

  {
    id: 'compare.swapPanes',
    labelKey: 'action.swapPanes',
    defaultBinding: 'Alt+Shift+X',
    run: () => editor().swapComparePanes(),
  },

  {
    id: 'query.focus',
    labelKey: 'query.focus',
    defaultBinding: 'Mod+Shift+F',
    run: () => document.getElementById(QUERY_INPUT_ID)?.focus(),
  },
  {
    id: 'app.showShortcuts',
    labelKey: 'shortcuts.title',
    defaultBinding: 'Mod+/',
    run: () => showShortcuts(),
  },
]

function stepTab(direction: 1 | -1): void {
  const { tabs, activeTabId, activateTab } = editor()
  const index = tabs.findIndex((tab) => tab.id === activeTabId)
  if (index === -1 || tabs.length < 2) return
  activateTab(tabs[(index + direction + tabs.length) % tabs.length].id)
}

export const COMMANDS_BY_ID = new Map(COMMANDS.map((command) => [command.id, command]))
