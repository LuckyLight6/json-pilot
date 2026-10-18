import { RotateCcw, Search } from 'lucide-react'
import { useEffect, useState } from 'react'

import { COMMANDS, COMMANDS_BY_ID, setShortcutsOpener, type CommandDefinition, type CommandId } from '@/commands/registry'
import { KeyCombo } from '@/components/key-combo'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/components/ui'
import { useI18n, type MessageKey } from '@/i18n'
import { chordFromEvent, formatBinding, isMacPlatform, serializeChord, type KeyChord } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { useKeybindingsStore } from '@/store/keybindings-store'

const IS_MAC = isMacPlatform()

/** Sections of the list, keyed by the command-id namespace, in display order. */
const GROUPS: { labelKey: MessageKey; namespaces: string[] }[] = [
  { labelKey: 'shortcuts.group.document', namespaces: ['document'] },
  { labelKey: 'shortcuts.group.editor', namespaces: ['editor'] },
  { labelKey: 'shortcuts.group.tabs', namespaces: ['tabs', 'compare'] },
  { labelKey: 'shortcuts.group.view', namespaces: ['view'] },
  { labelKey: 'shortcuts.group.general', namespaces: ['query', 'app'] },
]

function commandsIn(namespaces: string[]): CommandDefinition[] {
  return COMMANDS.filter((command) => namespaces.includes(command.id.split('.')[0]))
}

interface Recording {
  id: CommandId
  /** The opening `Mod+K` of a sequence, while waiting for the second chord. */
  first: KeyChord | null
}

function BindingRow({
  command,
  recording,
  onRecord,
}: {
  command: CommandDefinition
  recording: Recording | null
  onRecord: (id: CommandId | null) => void
}) {
  const { t } = useI18n()
  const binding = useKeybindingsStore((state) => state.bindingFor(command.id))
  const isOverridden = useKeybindingsStore((state) => state.overrides[command.id] !== undefined)
  const reset = useKeybindingsStore((state) => state.reset)
  const isRecording = recording?.id === command.id

  return (
    <li className="flex min-h-11 items-center justify-between gap-4 py-1.5">
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <span className="truncate">{t(command.labelKey)}</span>
        {isOverridden && (
          <span className="bg-primary/10 text-primary shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium">
            {t('shortcuts.modified')}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onRecord(isRecording ? null : command.id)}
          title={t('shortcuts.edit')}
          className={cn(
            'flex h-8 min-w-32 items-center justify-end rounded-lg border px-2 transition-colors',
            isRecording
              ? 'border-primary bg-primary/5'
              : 'hover:bg-muted/60 hover:border-border focus-visible:bg-muted/60 focus-visible:border-border border-transparent',
          )}
        >
          {isRecording ? (
            <span className="text-primary flex items-center gap-1.5 text-xs font-medium">
              {recording.first && <KeyCombo binding={serializeChord(recording.first)} size="md" />}
              <span className="animate-pulse">{recording.first ? '…' : t('shortcuts.recording')}</span>
            </span>
          ) : binding ? (
            <KeyCombo binding={binding} size="md" />
          ) : (
            <span className="text-muted-foreground/70 text-xs">{t('shortcuts.notSet')}</span>
          )}
        </button>
        <Button
          variant="ghost"
          size="sm"
          className={cn('size-8 px-0', !isOverridden && 'invisible')}
          title={t('shortcuts.reset')}
          aria-label={t('shortcuts.reset')}
          onClick={() => reset(command.id)}
        >
          <RotateCcw className="size-3.5" aria-hidden />
        </Button>
      </span>
    </li>
  )
}

export function ShortcutsDialog() {
  const { t } = useI18n()
  const [isOpen, setOpen] = useState(false)
  const [recording, setRecording] = useState<Recording | null>(null)
  const [clash, setClash] = useState<CommandId | null>(null)
  const [search, setSearch] = useState('')
  const rebind = useKeybindingsStore((state) => state.rebind)
  const resetAll = useKeybindingsStore((state) => state.resetAll)
  const bindingFor = useKeybindingsStore((state) => state.bindingFor)
  const setDispatcherSuspended = useKeybindingsStore((state) => state.setRecording)

  useEffect(() => setShortcutsOpener(() => setOpen(true)), [])

  // The global dispatcher is registered first, so it must stand aside while
  // keys are being recorded — or recording ⌥⇧F would also format the document.
  useEffect(() => {
    setDispatcherSuspended(recording !== null)
    return () => setDispatcherSuspended(false)
  }, [recording, setDispatcherSuspended])

  useEffect(() => {
    if (!recording) return

    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()
      // Also keeps Escape from reaching the dialog, which would close it.
      event.stopImmediatePropagation()

      const bare = !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey
      if (event.key === 'Escape') {
        setRecording(null)
        return
      }
      if (bare && event.key === 'Backspace' && !recording.first) {
        rebind(recording.id, '')
        setClash(null)
        setRecording(null)
        return
      }

      const chord = chordFromEvent(event, IS_MAC)
      if (!chord) return

      // A bare `Mod+K` opens a sequence, like VS Code's `Mod+K Mod+0`;
      // anything else commits immediately.
      if (!recording.first && chord.mod && chord.key === 'K' && !chord.shift && !chord.alt) {
        setRecording({ ...recording, first: chord })
        return
      }

      const binding = recording.first ? `${serializeChord(recording.first)} ${serializeChord(chord)}` : serializeChord(chord)

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

  const conflictLabel = clash ? COMMANDS_BY_ID.get(clash)?.labelKey : null
  const query = search.trim().toLowerCase()
  const matches = (command: CommandDefinition) =>
    !query ||
    t(command.labelKey).toLowerCase().includes(query) ||
    formatBinding(bindingFor(command.id), IS_MAC).toLowerCase().includes(query)
  const groups = GROUPS.map((group) => ({ ...group, commands: commandsIn(group.namespaces).filter(matches) })).filter(
    (group) => group.commands.length > 0,
  )

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        setOpen(next)
        setRecording(null)
        setClash(null)
        setSearch('')
      }}
    >
      <DialogContent className="flex max-h-[85vh] flex-col gap-4 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('shortcuts.title')}</DialogTitle>
          <DialogDescription>{t('shortcuts.description')}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('shortcuts.search')}
            aria-label={t('shortcuts.search')}
            className="h-9 pl-9"
          />
        </div>

        <p
          className={cn('text-xs', conflictLabel ? 'text-destructive' : 'text-muted-foreground')}
          role={conflictLabel ? 'alert' : undefined}
        >
          {conflictLabel
            ? t('shortcuts.conflict', { command: t(conflictLabel) })
            : t('shortcuts.recordingHint')}
        </p>

        <div className="-mx-1 min-h-0 flex-1 space-y-5 overflow-y-auto px-1">
          {groups.length === 0 && (
            <p className="text-muted-foreground py-10 text-center text-sm">{t('shortcuts.noMatches')}</p>
          )}
          {groups.map((group) => (
            <section key={group.labelKey}>
              <h3 className="text-muted-foreground mb-1.5 text-[11px] font-medium tracking-wider uppercase">
                {t(group.labelKey)}
              </h3>
              <ul className="divide-y rounded-xl border px-3">
                {group.commands.map((command) => (
                  <BindingRow
                    key={command.id}
                    command={command}
                    recording={recording}
                    onRecord={(id) => {
                      setClash(null)
                      setRecording(id ? { id, first: null } : null)
                    }}
                  />
                ))}
              </ul>
            </section>
          ))}
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
