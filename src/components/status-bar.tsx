import { Keyboard, WrapText } from 'lucide-react'

import { COMMANDS_BY_ID } from '@/commands/registry'
import { useI18n } from '@/i18n'
import { formatBinding, isMacPlatform } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { useActiveDocument, useEditorStore } from '@/store/editor-store'
import { useKeybindingsStore } from '@/store/keybindings-store'
import { usePreferencesStore } from '@/store/preferences-store'

const IS_MAC = isMacPlatform()

function countLines(value: string): number {
  return value ? value.split('\n').length : 0
}

function Hairline({ className }: { className?: string }) {
  return <span className={cn('bg-border h-3 w-px', className)} aria-hidden />
}

/** Ambient document facts, so successful actions no longer need a toast. */
export function StatusBar() {
  const { t, locale } = useI18n()
  const document = useActiveDocument()
  const cursor = useEditorStore((state) => state.cursor)
  const wordWrap = usePreferencesStore((state) => state.wordWrap)
  const toggleWordWrap = usePreferencesStore((state) => state.toggleWordWrap)
  const wrapBinding = useKeybindingsStore((state) => state.bindingFor('view.toggleWordWrap'))
  const shortcutsBinding = useKeybindingsStore((state) => state.bindingFor('app.showShortcuts'))

  const value = document?.value ?? ''
  const lines = countLines(value)
  const characters = value.length
  const format = (count: number) => count.toLocaleString(locale)

  return (
    <footer className="bg-surface-raised text-muted-foreground flex h-6 items-center justify-between gap-4 border-t px-2 font-mono text-[11px]">
      {/* A comparison holds two documents; per-document counts would be a lie. */}
      <div className="flex items-center gap-2.5 tabular-nums">
        {document && (
          <>
            <span>{lines === 1 ? t('status.linesOne') : t('status.lines', { count: format(lines) })}</span>
            <Hairline />
            <span>
              {characters === 1
                ? t('status.charactersOne')
                : t('status.characters', { count: format(characters) })}
            </span>
            <Hairline className="hidden sm:block" />
            <span className="hidden sm:inline">
              {t('status.cursor', { line: format(cursor.line), column: format(cursor.column) })}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-1">
        {/* Raycast-style footer action: the whole keymap, one hint away. */}
        <button
          type="button"
          onClick={() => COMMANDS_BY_ID.get('app.showShortcuts')?.run()}
          className="hover:bg-accent/60 hover:text-foreground flex h-5 items-center gap-1.5 rounded-md px-1.5 transition-colors"
        >
          <Keyboard className="size-3.5" aria-hidden />
          <span className="hidden md:inline">{t('shortcuts.title')}</span>
          {shortcutsBinding && (
            <kbd aria-hidden className="kbd-hint hidden md:inline-flex">
              {formatBinding(shortcutsBinding, IS_MAC)}
            </kbd>
          )}
        </button>
        <button
          type="button"
          onClick={toggleWordWrap}
          aria-pressed={wordWrap}
          title={wrapBinding ? t('status.wordWrap') + ' (' + formatBinding(wrapBinding, IS_MAC) + ')' : t('status.wordWrap')}
          className={cn(
            'flex h-5 items-center gap-1 rounded-md px-1.5 transition-colors',
            wordWrap ? 'bg-primary/10 text-primary' : 'hover:bg-accent/60 hover:text-foreground',
          )}
        >
          <WrapText className="size-3.5" aria-hidden />
          {t('status.wordWrap')}
        </button>
      </div>
    </footer>
  )
}
