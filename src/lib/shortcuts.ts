/**
 * Keyboard chord parsing, matching and display.
 *
 * Bindings are written as `Mod+Shift+F`. `Mod` is Cmd on macOS and Ctrl
 * elsewhere — the only portable way to spell "the platform's command key".
 * A bare `Ctrl` is deliberately not expressible: on Windows it would mean the
 * same thing as `Mod`, so allowing both invites bindings that silently collide.
 *
 * Matching goes through `KeyboardEvent.code` — the physical key — so a chord
 * keeps working on non-US layouts and on macOS, where Alt turns `F` into `ƒ`.
 */

export interface KeyChord {
  mod: boolean
  alt: boolean
  shift: boolean
  /** Canonical key name: `F`, `1`, `[`, `Enter`, `ArrowLeft`, … */
  key: string
}

/** `KeyboardEvent.code` values that do not follow the `KeyX` / `DigitN` pattern. */
const CODE_TO_KEY: Record<string, string> = {
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Minus: '-',
  Equal: '=',
  Backquote: '`',
  Space: 'Space',
  Enter: 'Enter',
  NumpadEnter: 'Enter',
  Escape: 'Escape',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Tab: 'Tab',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
}

const MODIFIER_CODES = new Set([
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
])

/** Turns a physical key code into the canonical name used inside a binding. */
export function keyFromCode(code: string): string | null {
  if (MODIFIER_CODES.has(code)) return null
  if (code in CODE_TO_KEY) return CODE_TO_KEY[code]
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit[0-9]$/.test(code)) return code.slice(5)
  if (/^Numpad[0-9]$/.test(code)) return code.slice(6)
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) return code
  return null
}

const KNOWN_KEYS = new Set([
  ...Object.values(CODE_TO_KEY),
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  ...'0123456789',
  ...Array.from({ length: 24 }, (_, i) => `F${i + 1}`),
])

/** Parses `Mod+Shift+F`. Returns null for anything malformed or unknown. */
export function parseChord(binding: string): KeyChord | null {
  const parts = binding.split('+').map((part) => part.trim())
  if (parts.length === 0) return null

  const chord: KeyChord = { mod: false, alt: false, shift: false, key: '' }

  for (const part of parts) {
    const lower = part.toLowerCase()
    if (lower === 'mod') {
      if (chord.mod) return null
      chord.mod = true
    } else if (lower === 'alt' || lower === 'option') {
      if (chord.alt) return null
      chord.alt = true
    } else if (lower === 'shift') {
      if (chord.shift) return null
      chord.shift = true
    } else {
      if (chord.key) return null
      const key = part.length === 1 ? part.toUpperCase() : normalizeNamedKey(part)
      if (!KNOWN_KEYS.has(key)) return null
      chord.key = key
    }
  }

  return chord.key ? chord : null
}

function normalizeNamedKey(part: string): string {
  if (/^f([1-9]|1[0-9]|2[0-4])$/i.test(part)) return part.toUpperCase()
  const match = [...KNOWN_KEYS].find((known) => known.toLowerCase() === part.toLowerCase())
  return match ?? part
}

/** Canonical spelling, so two equal chords always serialise identically. */
export function serializeChord(chord: KeyChord): string {
  const parts: string[] = []
  if (chord.mod) parts.push('Mod')
  if (chord.alt) parts.push('Alt')
  if (chord.shift) parts.push('Shift')
  parts.push(chord.key)
  return parts.join('+')
}

/**
 * Reads a chord off a keyboard event, or null when the event cannot be one:
 * a bare modifier, an unmapped key, an IME composition, or the platform's
 * *other* command key (Ctrl on macOS, Meta elsewhere) which we never claim.
 */
export function chordFromEvent(
  event: Pick<KeyboardEvent, 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'isComposing'>,
  isMac: boolean,
): KeyChord | null {
  if (event.isComposing) return null

  const foreignModifier = isMac ? event.ctrlKey : event.metaKey
  if (foreignModifier) return null

  const key = keyFromCode(event.code)
  if (!key) return null

  return {
    mod: isMac ? event.metaKey : event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    key,
  }
}

export function chordsEqual(a: KeyChord, b: KeyChord): boolean {
  return a.mod === b.mod && a.alt === b.alt && a.shift === b.shift && a.key === b.key
}

const MAC_SYMBOLS: Record<string, string> = {
  Mod: '⌘',
  Alt: '⌥',
  Shift: '⇧',
  Enter: '↩',
  Backspace: '⌫',
  Delete: '⌦',
  Escape: '⎋',
  Tab: '⇥',
  Space: '␣',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
}

const OTHER_NAMES: Record<string, string> = {
  Mod: 'Ctrl',
  Alt: 'Alt',
  Shift: 'Shift',
}

/**
 * Renders a binding for display: `⇧⌘F` on macOS, `Ctrl+Shift+F` elsewhere.
 *
 * Modifier order is platform convention, not the order the binding was written
 * in: Apple puts Command last (⌥⇧⌘), Windows puts Ctrl first.
 */
export function formatChord(binding: string, isMac: boolean): string {
  const chord = parseChord(binding)
  if (!chord) return binding

  const modifiers: string[] = []
  if (isMac) {
    if (chord.alt) modifiers.push(MAC_SYMBOLS.Alt)
    if (chord.shift) modifiers.push(MAC_SYMBOLS.Shift)
    if (chord.mod) modifiers.push(MAC_SYMBOLS.Mod)
  } else {
    if (chord.mod) modifiers.push(OTHER_NAMES.Mod)
    if (chord.alt) modifiers.push(OTHER_NAMES.Alt)
    if (chord.shift) modifiers.push(OTHER_NAMES.Shift)
  }

  const key = (isMac && MAC_SYMBOLS[chord.key]) || chord.key
  return isMac ? [...modifiers, key].join('') : [...modifiers, key].join('+')
}

/** True when the platform is macOS, where `Mod` means Cmd. */
export function isMacPlatform(): boolean {
  return /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent)
}

/**
 * A binding is one chord, or two separated by a space — the VS Code `Mod+K M`
 * shape. Two-key sequences exist because almost every single `Mod`+letter is
 * already taken by Monaco or the browser.
 */
export type KeySequence = KeyChord[]

export function parseBinding(binding: string): KeySequence | null {
  const parts = binding.trim().split(/\s+/)
  if (parts.length === 0 || parts.length > 2) return null

  const chords: KeyChord[] = []
  for (const part of parts) {
    const chord = parseChord(part)
    if (!chord) return null
    chords.push(chord)
  }
  return chords
}

export function serializeBinding(sequence: KeySequence): string {
  return sequence.map(serializeChord).join(' ')
}

/** Renders a whole binding, e.g. `⌘K M` or `Ctrl+K M`. */
export function formatBinding(binding: string, isMac: boolean): string {
  const sequence = parseBinding(binding)
  if (!sequence) return binding
  return sequence.map((chord) => formatChord(serializeChord(chord), isMac)).join(' ')
}

/** True when `chord` is the opening key of `binding` and more keys follow. */
export function isPrefixOf(chord: KeyChord, binding: string): boolean {
  const sequence = parseBinding(binding)
  return sequence !== null && sequence.length > 1 && chordsEqual(sequence[0], chord)
}

/** True when `chords` is exactly `binding`. */
export function matchesBinding(chords: KeySequence, binding: string): boolean {
  const sequence = parseBinding(binding)
  if (!sequence || sequence.length !== chords.length) return false
  return sequence.every((chord, index) => chordsEqual(chord, chords[index]))
}
