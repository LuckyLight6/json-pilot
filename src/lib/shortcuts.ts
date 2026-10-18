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

/**
 * Fallback for key events that carry no physical key code: virtual keyboards,
 * remote-desktop clients and automation tools often send `code: ''`. Only an
 * unmodified character or a named key can be trusted here — the produced
 * character changes with Shift, Alt and the layout, which is why the code is
 * preferred whenever there is one.
 */
export function keyFromKeyValue(key: string): string | null {
  if (key === ' ') return 'Space'
  const candidate = key.length === 1 ? key.toUpperCase() : key
  return KNOWN_KEYS.has(candidate) ? candidate : null
}

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
  event: Pick<KeyboardEvent, 'code' | 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'isComposing'>,
  isMac: boolean,
): KeyChord | null {
  if (event.isComposing) return null

  const foreignModifier = isMac ? event.ctrlKey : event.metaKey
  if (foreignModifier) return null

  const hasPhysicalKey = event.code !== '' && event.code !== 'Unidentified'
  const key = hasPhysicalKey ? keyFromCode(event.code) : keyFromKeyValue(event.key)
  if (!key) return null

  return {
    mod: isMac ? event.metaKey : event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    key,
  }
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
}

/** Key names that read better spelled differently, on every platform. */
const KEY_LABELS: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
  Escape: 'Esc',
}

const OTHER_NAMES: Record<string, string> = {
  Mod: 'Ctrl',
  Alt: 'Alt',
  Shift: 'Shift',
}

/**
 * The keys of one chord, one entry per keycap, in platform order: Apple puts
 * Command last (⌥⇧⌘), Windows puts Ctrl first. Null for a malformed chord.
 */
export function chordKeys(binding: string, isMac: boolean): string[] | null {
  const chord = parseChord(binding)
  if (!chord) return null

  const keys: string[] = []
  if (isMac) {
    if (chord.alt) keys.push(MAC_SYMBOLS.Alt)
    if (chord.shift) keys.push(MAC_SYMBOLS.Shift)
    if (chord.mod) keys.push(MAC_SYMBOLS.Mod)
  } else {
    if (chord.mod) keys.push(OTHER_NAMES.Mod)
    if (chord.alt) keys.push(OTHER_NAMES.Alt)
    if (chord.shift) keys.push(OTHER_NAMES.Shift)
  }
  keys.push((isMac && MAC_SYMBOLS[chord.key]) || KEY_LABELS[chord.key] || chord.key)
  return keys
}

/** Renders a chord as text: `⇧⌘F` on macOS, `Ctrl+Shift+F` elsewhere. */
export function formatChord(binding: string, isMac: boolean): string {
  const keys = chordKeys(binding, isMac)
  if (!keys) return binding
  return keys.join(isMac ? '' : '+')
}

/** Keycaps for a whole binding, one list per chord: `Mod+K Mod+0` → [[⌘, K], [⌘, 0]]. */
export function bindingKeys(binding: string, isMac: boolean): string[][] {
  const sequence = parseBinding(binding)
  if (!sequence) return []
  return sequence.map((chord) => chordKeys(serializeChord(chord), isMac) ?? [])
}

/** True when the platform is macOS, where `Mod` means Cmd. */
export function isMacPlatform(): boolean {
  // At build time (the site is prerendered) there is no navigator: show the
  // Mac glyphs, which the page swaps for Windows names once it runs.
  if (typeof navigator === 'undefined') return true
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

/**
 * A keymap pre-parsed for dispatch, keyed by canonical chord text, so a key
 * press resolves with map lookups instead of re-parsing every binding — the
 * dispatcher sees every keystroke typed into the editor.
 */
export interface BindingIndex<Id extends string> {
  /** Single-chord bindings: `Alt+Shift+F` → id. */
  chords: Map<string, Id>
  /** Two-chord bindings: `Mod+K M` → id. */
  sequences: Map<string, Id>
  /** Opening chords of the sequences; pressing one waits for the second. */
  prefixes: Set<string>
}

/** Indexes `[id, binding]` pairs. When two ids share a binding, the first wins. */
export function buildBindingIndex<Id extends string>(bindings: Iterable<readonly [Id, string]>): BindingIndex<Id> {
  const index: BindingIndex<Id> = { chords: new Map(), sequences: new Map(), prefixes: new Set() }

  for (const [id, binding] of bindings) {
    const sequence = parseBinding(binding)
    if (!sequence) continue
    const [first, second] = sequence.map(serializeChord)
    if (second === undefined) {
      if (!index.chords.has(first)) index.chords.set(first, id)
    } else {
      const key = `${first} ${second}`
      if (!index.sequences.has(key)) index.sequences.set(key, id)
      index.prefixes.add(first)
    }
  }

  return index
}
