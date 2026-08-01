import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

// Side-effect module: importing it wires Monaco to the bundled workers and stops
// `@monaco-editor/react` from pulling a second copy of Monaco off a CDN.
// Only the JSON language is registered — nothing else is shipped.
self.MonacoEnvironment = {
  getWorker: (_workerId, label) => (label === 'json' ? new jsonWorker() : new editorWorker()),
}

loader.config({ monaco })

// Unbind the Monaco defaults that collide with JSON Pilot's own shortcuts.
// The window-capture dispatcher already swallows our chords first, but if the
// user rebinds a command away from its default, the freed key must not fall
// through to a surprise Monaco behaviour — Alt+Shift+F would silently run
// Monaco's *own* JSON formatter, bypassing our transform and its error toasts.
monaco.editor.addKeybindingRules([
  // editor.action.formatDocument
  { keybinding: monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, command: null },
  // editor.action.insertCursorAtEndOfEachLineSelected
  { keybinding: monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyI, command: null },
])
