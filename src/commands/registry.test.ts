import { describe, expect, it } from 'vitest'

import { COMMANDS } from './registry'

import { buildBindingIndex, parseBinding } from '@/lib/shortcuts'


describe('default keymap', () => {
  it('gives every command a valid default shortcut', () => {
    for (const command of COMMANDS) {
      expect(parseBinding(command.defaultBinding), command.id).not.toBeNull()
    }
  })

  it('never binds two commands to the same keys', () => {
    const index = buildBindingIndex(COMMANDS.map((command) => [command.id, command.defaultBinding] as const))
    expect(index.chords.size + index.sequences.size).toBe(COMMANDS.length)
  })

  it('never uses a sequence prefix as a shortcut of its own', () => {
    const index = buildBindingIndex(COMMANDS.map((command) => [command.id, command.defaultBinding] as const))
    for (const prefix of index.prefixes) expect(index.chords.has(prefix), prefix).toBe(false)
  })
})
