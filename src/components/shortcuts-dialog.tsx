import { RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'

import { COMMANDS, setShortcutsOpener, type CommandId } from '@/commands/registry'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui'
import { useI18n } from '@/i18n'
import {
  chordFromEvent,
  formatBinding,
  isMacPlatform,
  serializeChord,
  type KeyChord,
} from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { useKeybindingsStore } from '@/store/keybindings-store'

const IS_MAC = isMacPlatform()

interface Recording {
  id: CommandId
  first: KeyChord | null
}

function BindingCell({ id, recording, onRecord }: {
  id: CommandId
  recording: Recording | null
  onRecord: (id: CommandId | null) => void
}) {
  const { t } = useI18n()
  const binding = useKeybindingsStore((state) => state.bindingFor(id))
  const isOverridden = useKeybindingsStore((state) => state.overrides[id] !== undefined)
  const reset = useKeybindingsStore((state) => state.reset)
  const isRecording = recording?.id === id

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onRecord(isRecording ? null : id)}
        className={cn(
          'min-w-28 rounded-md border px-2 py-1 font-mono text-xs transition-colors',
          isRecording ? 'border-ring bg-accent animate-pulse' : 'hover:bg-accent',
        )}
      >
        {isRecording
          ? recording.first
            ? `${formatBinding(serializeChord(recording.first), IS_MAC)} …`
            : t('shortcuts.recording')
          : formatBinding(binding, IS_MAC)}
      </button>
      <Button
        variant="ghost"
        size="sm"
        className={cn('px-1.5', !isOverridden && 'invisible')}
        title={t('shortcuts.reset')}
        aria-label={t('shortcuts.reset')}
        onClick={() => reset(id)}
      >
        <RotateCcw className="size-3.5" aria-hidden />
      </Button>
    </div>
  )
}

export function ShortcutsDialog() {
  const { t } = useI18n()
  const [isOpen, setOpen] = useState(false)
  const [recording, setRecording] = useState<Recording | null>(null)
  const [clash, setClash] = useState<CommandId | null>(null)
  const rebind = useKeybindingsStore((state) => state.rebind)
  const resetAll = useKeybindingsStore((state) => state.resetAll)

  useEffect(() => setShortcutsOpener(() => setOpen(true)), [])

  // While recording, this listener outranks the global dispatcher (also capture,
  // but installed later, so it runs after ours only if ours does not stop it).
  useEffect(() => {
    if (!recording) return

    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopImmediatePropagation()

      if (event.key === 'Escape') {
        setRecording(null)
        return
      }

      const chord = chordFromEvent(event, IS_MAC)
      if (!chord) return

      // A bare `Mod+K` is treated as the start of a sequence, mirroring how the
      // defaults are written; anything else commits immediately.
      if (!recording.first && chord.mod && chord.key === 'K' && !chord.shift && !chord.alt) {
        setRecording({ ...recording, first: chord })
        return
      }

      const binding = recording.first
        ? `${serializeChord(recording.first)} ${serializeChord(chord)}`
        : serializeChord(chord)

      const conflict = useKeybindingsStore.getState().commandUsing(binding, recording.id)
      if (conflict) {
        setClash(conflict)
        setRecording(null)
        return
      }

      rebind(recording.id, binding)
      setClash(null)
      setRecording(null)
    }

    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [recording, rebind])

  const conflictLabel = clash
    ? COMMANDS.find((command) => command.id === clash)?.labelKey
    : null

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        setOpen(next)
        setRecording(null)
        setClash(null)
      }}
    >
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('shortcuts.title')}</DialogTitle>
          <DialogDescription>{t('shortcuts.description')}</DialogDescription>
        </DialogHeader>

        {conflictLabel && (
          <p className="text-destructive text-xs" role="alert">
            {t('shortcuts.conflict', { command: t(conflictLabel) })}
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <ul className="divide-y">
            {COMMANDS.map((command) => (
              <li key={command.id} className="flex items-center justify-between gap-4 py-1.5">
                <span className="text-sm">{t(command.labelKey)}</span>
                <BindingCell
                  id={command.id}
                  recording={recording}
                  onRecord={(id) => {
                    setClash(null)
                    setRecording(id ? { id, first: null } : null)
                  }}
                />
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAll}>
            {t('shortcuts.resetAll')}
          </Button>
          <Button onClick={() => setOpen(false)}>{t('query.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
