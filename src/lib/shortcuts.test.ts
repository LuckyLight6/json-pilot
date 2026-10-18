import { describe, expect, it } from 'vitest'

import {
  chordFromEvent,
  bindingKeys,
  buildBindingIndex,
  formatBinding,
  formatChord,
  keyFromCode,
  keyFromKeyValue,
  parseBinding,
  parseChord,
  serializeBinding,
  serializeChord,
} from './shortcuts'

function event(code: string, modifiers: Partial<Record<'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'isComposing', boolean>> = {}) {
  return {
    code,
    key: '',
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    isComposing: false,
    ...modifiers,
  }
}

describe('keyFromCode', () => {
  it('maps letter, digit and function keys', () => {
    expect(keyFromCode('KeyF')).toBe('F')
    expect(keyFromCode('Digit1')).toBe('1')
    expect(keyFromCode('Numpad7')).toBe('7')
    expect(keyFromCode('F11')).toBe('F11')
  })

  it('maps punctuation and named keys', () => {
    expect(keyFromCode('BracketLeft')).toBe('[')
    expect(keyFromCode('Slash')).toBe('/')
    expect(keyFromCode('NumpadEnter')).toBe('Enter')
    expect(keyFromCode('ArrowLeft')).toBe('ArrowLeft')
  })

  it('rejects bare modifiers and unknown codes', () => {
    expect(keyFromCode('ShiftLeft')).toBeNull()
    expect(keyFromCode('MetaRight')).toBeNull()
    expect(keyFromCode('Lang1')).toBeNull()
  })
})

describe('parseChord', () => {
  it('parses modifiers in any order and any case', () => {
    expect(parseChord('Mod+Shift+F')).toEqual({ mod: true, alt: false, shift: true, key: 'F' })
    expect(parseChord('shift+mod+f')).toEqual({ mod: true, alt: false, shift: true, key: 'F' })
  })

  it('treats Option as Alt', () => {
    expect(parseChord('Option+K')).toEqual({ mod: false, alt: true, shift: false, key: 'K' })
  })

  it('accepts punctuation and named keys', () => {
    expect(parseChord('Mod+/')).toMatchObject({ key: '/' })
    expect(parseChord('Mod+Enter')).toMatchObject({ key: 'Enter' })
    expect(parseChord('Alt+ArrowRight')).toMatchObject({ key: 'ArrowRight' })
  })

  it('rejects malformed bindings', () => {
    expect(parseChord('')).toBeNull()
    expect(parseChord('Mod')).toBeNull()
    expect(parseChord('Mod+Mod+F')).toBeNull()
    expect(parseChord('Mod+F+G')).toBeNull()
    expect(parseChord('Ctrl+F')).toBeNull()
    expect(parseChord('Mod+Unknown')).toBeNull()
  })
})

describe('serializeChord', () => {
  it('round-trips through a canonical spelling', () => {
    const chord = parseChord('shift+mod+f')!
    expect(serializeChord(chord)).toBe('Mod+Shift+F')
    expect(parseChord(serializeChord(chord))).toEqual(chord)
  })
})

describe('bindingKeys', () => {
  it('splits a binding into keycaps in platform order', () => {
    expect(bindingKeys('Mod+Alt+Shift+F', true)).toEqual([['⌥', '⇧', '⌘', 'F']])
    expect(bindingKeys('Mod+Alt+Shift+F', false)).toEqual([['Ctrl', 'Alt', 'Shift', 'F']])
  })

  it('keeps the chords of a sequence apart', () => {
    expect(bindingKeys('Mod+K Mod+0', true)).toEqual([['⌘', 'K'], ['⌘', '0']])
    expect(bindingKeys('Mod+K D', false)).toEqual([['Ctrl', 'K'], ['D']])
  })

  it('spells awkward keys readably', () => {
    expect(bindingKeys('Mod+Alt+PageDown', false)).toEqual([['Ctrl', 'Alt', 'PgDn']])
    expect(bindingKeys('Escape', false)).toEqual([['Esc']])
    expect(bindingKeys('Backspace', true)).toEqual([['⌫']])
  })

  it('returns nothing for an unbound command', () => {
    expect(bindingKeys('', true)).toEqual([])
  })
})

describe('keyFromKeyValue', () => {
  it('accepts plain characters and named keys', () => {
    expect(keyFromKeyValue('/')).toBe('/')
    expect(keyFromKeyValue('f')).toBe('F')
    expect(keyFromKeyValue('Enter')).toBe('Enter')
    expect(keyFromKeyValue(' ')).toBe('Space')
  })

  it('rejects characters the keymap cannot name', () => {
    expect(keyFromKeyValue('ƒ')).toBeNull()
    expect(keyFromKeyValue('?')).toBeNull()
    expect(keyFromKeyValue('Unidentified')).toBeNull()
  })
})

describe('chordFromEvent', () => {
  it('falls back to the key value when the event has no physical code', () => {
    const synthetic = { ...event('', { metaKey: true }), key: '/' }
    expect(chordFromEvent(synthetic, true)).toMatchObject({ mod: true, key: '/' })
  })

  it('prefers the physical code whenever there is one', () => {
    const alt = { ...event('KeyF', { altKey: true }), key: 'ƒ' }
    expect(chordFromEvent(alt, true)).toMatchObject({ alt: true, key: 'F' })
  })

  it('maps Cmd to Mod on macOS and Ctrl to Mod elsewhere', () => {
    expect(chordFromEvent(event('KeyF', { metaKey: true }), true)).toMatchObject({ mod: true, key: 'F' })
    expect(chordFromEvent(event('KeyF', { ctrlKey: true }), false)).toMatchObject({ mod: true, key: 'F' })
  })

  it('ignores the platform’s other command key', () => {
    // Ctrl+A on macOS is "move to line start" and must stay Monaco's.
    expect(chordFromEvent(event('KeyA', { ctrlKey: true }), true)).toBeNull()
    expect(chordFromEvent(event('KeyA', { metaKey: true }), false)).toBeNull()
  })

  it('ignores bare modifiers and IME composition', () => {
    expect(chordFromEvent(event('ShiftLeft', { shiftKey: true }), true)).toBeNull()
    expect(chordFromEvent(event('KeyF', { metaKey: true, isComposing: true }), true)).toBeNull()
  })

  it('reads the physical key, so Alt on macOS still resolves to the letter', () => {
    // Alt+F emits "ƒ" as event.key on macOS; event.code stays KeyF.
    expect(chordFromEvent(event('KeyF', { altKey: true, metaKey: true }), true)).toMatchObject({
      mod: true,
      alt: true,
      key: 'F',
    })
  })

  it('produces a chord that matches the parsed binding', () => {
    const fromEvent = chordFromEvent(event('KeyF', { metaKey: true, shiftKey: true }), true)!
    expect(serializeChord(fromEvent)).toBe('Mod+Shift+F')
  })
})

describe('formatChord', () => {
  it('uses symbols on macOS and words elsewhere', () => {
    expect(formatChord('Mod+Shift+F', true)).toBe('⇧⌘F')
    expect(formatChord('Mod+Shift+F', false)).toBe('Ctrl+Shift+F')
  })

  it('symbolises named keys on macOS only', () => {
    expect(formatChord('Mod+Enter', true)).toBe('⌘↩')
    expect(formatChord('Mod+Enter', false)).toBe('Ctrl+Enter')
  })

  it('orders modifiers consistently regardless of how the binding was written', () => {
    expect(formatChord('Shift+Alt+Mod+K', true)).toBe('⌥⇧⌘K')
  })

  it('passes an unparseable binding through untouched', () => {
    expect(formatChord('nonsense', true)).toBe('nonsense')
  })
})

describe('key sequences', () => {
  it('parses a two-chord binding', () => {
    expect(parseBinding('Mod+K M')).toEqual([
      { mod: true, alt: false, shift: false, key: 'K' },
      { mod: false, alt: false, shift: false, key: 'M' },
    ])
  })

  it('rejects sequences longer than two chords', () => {
    expect(parseBinding('Mod+K M N')).toBeNull()
  })

  it('rejects a sequence with a malformed chord', () => {
    expect(parseBinding('Mod+K Ctrl+M')).toBeNull()
  })

  it('round-trips through serialisation', () => {
    expect(serializeBinding(parseBinding('mod+k m')!)).toBe('Mod+K M')
  })

  it('formats both chords', () => {
    expect(formatBinding('Mod+K M', true)).toBe('⌘K M')
    expect(formatBinding('Mod+K M', false)).toBe('Ctrl+K M')
  })

})

describe('buildBindingIndex', () => {
  const index = buildBindingIndex([
    ['format', 'Alt+Shift+F'],
    ['palette', 'Mod+K M'],
    ['also-format', 'alt+shift+f'],
    ['broken', 'Mod+Nope'],
  ] as const)

  it('indexes single chords by their canonical spelling', () => {
    expect(index.chords.get('Alt+Shift+F')).toBe('format')
  })

  it('lets the first of two identical bindings win', () => {
    expect([...index.chords.values()]).toEqual(['format'])
  })

  it('indexes sequences and remembers their opening chord', () => {
    expect(index.sequences.get('Mod+K M')).toBe('palette')
    expect(index.prefixes.has('Mod+K')).toBe(true)
    expect(index.chords.has('Mod+K')).toBe(false)
  })

  it('skips bindings that do not parse', () => {
    expect(index.chords.size + index.sequences.size).toBe(2)
  })
})
