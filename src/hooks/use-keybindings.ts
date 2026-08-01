import { useEffect, useRef } from 'react'

import { COMMANDS } from '@/commands/registry'
import {
  chordFromEvent,
  isMacPlatform,
  isPrefixOf,
  matchesBinding,
  type KeyChord,
} from '@/lib/shortcuts'
import { useKeybindingsStore } from '@/store/keybindings-store'

/** How long a pending `Mod+K` waits for its second key before giving up. */
const CHORD_TIMEOUT_MS = 2000

const IS_MAC = isMacPlatform()

/**
 * Dispatches JSON Pilot commands from a single window-level capture listener.
 *
 * Capture is what makes this authoritative: Monaco's keybinding service listens
 * bubble-phase on each editor container, so window-capture always runs first and
 * `preventDefault` + `stopPropagation` stops the key ever reaching it. That also
 * means anything matched here must be a real command — swallowing a key Monaco
 * needed would break typing.
 */
export function useKeybindings(): void {
  const pending = useRef<KeyChord | null>(null)
  const pendingTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const clearPending = () => {
      clearTimeout(pendingTimer.current)
      pending.current = null
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const chord = chordFromEvent(event, IS_MAC)
      if (!chord) return

      const { bindingFor } = useKeybindingsStore.getState()

      // Second key of a pending sequence.
      if (pending.current) {
        const sequence = [pending.current, chord]
        clearPending()
        const command = COMMANDS.find((candidate) => matchesBinding(sequence, bindingFor(candidate.id)))
        // Always swallow: the prefix was consumed, so the follow-up must not
        // reach the editor as text even when it matches nothing.
        event.preventDefault()
        event.stopPropagation()
        command?.run()
        return
      }

      const exact = COMMANDS.find((candidate) => matchesBinding([chord], bindingFor(candidate.id)))
      if (exact) {
        event.preventDefault()
        event.stopPropagation()
        exact.run()
        return
      }

      if (COMMANDS.some((candidate) => isPrefixOf(chord, bindingFor(candidate.id)))) {
        event.preventDefault()
        event.stopPropagation()
        pending.current = chord
        pendingTimer.current = setTimeout(clearPending, CHORD_TIMEOUT_MS)
      }
    }

    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => {
      clearPending()
      window.removeEventListener('keydown', onKeyDown, { capture: true })
    }
  }, [])
}
