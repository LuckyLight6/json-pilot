import { useEffect, useRef } from 'react'

import { COMMANDS_BY_ID, type CommandId } from '@/commands/registry'
import { chordFromEvent, isMacPlatform, serializeChord } from '@/lib/shortcuts'
import { useKeybindingsStore } from '@/store/keybindings-store'

/** How long a pending `Mod+K` waits for its second key before giving up. */
const CHORD_TIMEOUT_MS = 2000

const IS_MAC = isMacPlatform()

/**
 * Dispatches JSON Pilot commands from a single window-level capture listener.
 *
 * Capture is what makes this authoritative: Monaco's keybinding service listens
 * bubble-phase on each editor container, so window-capture always runs first.
 * A single-chord command is swallowed outright — `preventDefault` plus
 * `stopPropagation` — so a shadowed Monaco binding never runs as well. That
 * also means anything matched here must be a real command: swallowing a key
 * Monaco needed would break typing.
 *
 * Sequences (`Mod+K Mod+0`) share their prefix with Monaco's own `Mod+K`
 * sequences, so both keys are allowed through to Monaco: only the browser
 * default is prevented. Monaco then completes or quietly cancels its own
 * sequence, and every `Mod+K` combination JSON Pilot does not define keeps
 * doing what it does in the editor.
 */
export function useKeybindings(): void {
  /** The opening chord of a sequence, in canonical text, while waiting for the second. */
  const pending = useRef<string | null>(null)
  const pendingTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const clearPending = () => {
      clearTimeout(pendingTimer.current)
      pending.current = null
    }

    const run = (id: CommandId) => COMMANDS_BY_ID.get(id)?.run()

    const onKeyDown = (event: KeyboardEvent) => {
      const chord = chordFromEvent(event, IS_MAC)
      if (!chord) return

      const key = serializeChord(chord)
      const { index, recording } = useKeybindingsStore.getState()
      if (recording) return

      if (pending.current) {
        const id = index.sequences.get(`${pending.current} ${key}`)
        clearPending()
        if (id) {
          event.preventDefault()
          run(id)
        }
        return
      }

      const id = index.chords.get(key)
      if (id) {
        event.preventDefault()
        event.stopPropagation()
        run(id)
        return
      }

      if (index.prefixes.has(key)) {
        // Keep the browser's own Mod+K (address-bar search) out of the way.
        event.preventDefault()
        pending.current = key
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
