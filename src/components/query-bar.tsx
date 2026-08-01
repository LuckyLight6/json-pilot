import { Play, X } from 'lucide-react'
import { useState } from 'react'

import { QUERY_INPUT_ID } from '@/commands/registry'
import { Button, Input, ToggleGroup, ToggleGroupItem } from '@/components/ui'
import { useI18n } from '@/i18n'
import type { QueryKind } from '@/lib/json/query'
import { formatBinding, isMacPlatform } from '@/lib/shortcuts'
import { useActiveTab, useEditorStore } from '@/store/editor-store'
import { useKeybindingsStore } from '@/store/keybindings-store'

const IS_MAC = isMacPlatform()

const KIND_ITEM_CLASS =
  'h-5 flex-none min-w-0 rounded-[5px] first:rounded-l-[5px] last:rounded-r-[5px] px-1.5 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground data-[state=on]:bg-primary/10 data-[state=on]:text-primary'

export function QueryBar() {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<QueryKind>('javascript')
  const runQuery = useEditorStore((state) => state.runQuery)
  const activeTab = useActiveTab()
  const focusBinding = useKeybindingsStore((state) => state.bindingFor('query.focus'))

  const submit = () => {
    if (query.trim()) runQuery(query, kind)
  }

  // A query runs against one JSON Document; a comparison holds two.
  if (activeTab?.kind !== 'document') return null

  return (
    <div className="bg-surface-raised flex h-10 items-center gap-1.5 border-b px-1.5">
      {/* A soft tinted pill rather than a hard-bordered box: contained enough
          to read as one field, quiet enough to sit inside the chrome. */}
      <div className="bg-muted/50 focus-within:bg-background focus-within:ring-ring/25 hover:bg-muted/70 focus-within:hover:bg-background flex h-8 min-w-0 flex-1 items-center rounded-lg pr-1 pl-1 transition-all duration-200 focus-within:ring-2">
        <ToggleGroup
          type="single"
          value={kind}
          // Radix reports "" when the active item is pressed again; keep a kind selected.
          onValueChange={(next: string) => next && setKind(next as QueryKind)}
          size="sm"
          aria-label={t('query.kind')}
          className="h-6 shrink-0 gap-0.5 rounded-md p-0.5"
        >
          <ToggleGroupItem value="javascript" className={KIND_ITEM_CLASS}>
            {t('query.javascript')}
          </ToggleGroupItem>
          <ToggleGroupItem value="jsonpath" className={KIND_ITEM_CLASS}>
            {t('query.jsonpath')}
          </ToggleGroupItem>
        </ToggleGroup>

        <Input
          id={QUERY_INPUT_ID}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            submit()
          }}
          placeholder={t(kind === 'jsonpath' ? 'query.placeholder.jsonpath' : 'query.placeholder.javascript')}
          className="placeholder:text-muted-foreground/60 h-full min-w-0 flex-1 border-0 bg-transparent px-2 font-mono text-[13px] shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
          spellCheck={false}
        />

        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            title={t('query.clear')}
            aria-label={t('query.clear')}
            className="text-muted-foreground hover:bg-accent hover:text-foreground mr-0.5 flex size-5 shrink-0 items-center justify-center rounded-[4px] transition-colors"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : (
          focusBinding && (
            <kbd aria-hidden className="kbd-hint pointer-events-none mr-0.5 hidden shrink-0 sm:inline-flex">
              {formatBinding(focusBinding, IS_MAC)}
            </kbd>
          )
        )}
      </div>

      <Button size="sm" onClick={submit} disabled={!query.trim()} className="h-7 gap-1.5 rounded-lg px-2.5 text-xs">
        <Play aria-hidden className="size-3.5" />
        <span className="hidden sm:inline">{t('query.run')}</span>
        <kbd
          aria-hidden
          className="kbd-hint border-primary-foreground/25 text-primary-foreground/70 hidden bg-transparent lg:inline-flex"
        >
          ⏎
        </kbd>
      </Button>
    </div>
  )
}
