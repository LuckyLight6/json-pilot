import { Lightbulb, Play, X } from 'lucide-react'
import { useRef, useState } from 'react'

import { QUERY_INPUT_ID } from '@/commands/registry'
import { KeyCombo } from '@/components/key-combo'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui'
import { useI18n } from '@/i18n'
import type { QueryKind } from '@/lib/json/query'
import { readPreference, writePreference } from '@/lib/local-preference'
import { useActiveTabKind, useEditorStore } from '@/store/editor-store'
import { useKeybindingsStore } from '@/store/keybindings-store'

const QUERY_KINDS: QueryKind[] = ['javascript', 'jsonpath']
const QUERY_KIND_KEY = 'query-kind'

const KIND_ITEM_CLASS =
  'h-5 flex-none min-w-0 rounded-[5px] first:rounded-l-[5px] last:rounded-r-[5px] px-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground data-[state=on]:bg-primary/10 data-[state=on]:text-primary data-[state=on]:focus-visible:bg-primary/15'

/** Code, not copy: identical in every locale, and all valid against the sample document. */
const EXAMPLES: Record<QueryKind, string[]> = {
  javascript: [
    'd => d.lastEvent',
    ".endpoints.filter(p => p.startsWith('/orders'))",
    'Object.keys(data)',
    '({ service: data.service, burst: data.limits.burst })',
  ],
  jsonpath: ['$..id', "$.endpoints[?(@.startsWith('/orders'))]", '$.limits.*', '$.endpoints[0]'],
}

function ExamplesMenu({ onPick }: { onPick: (kind: QueryKind, query: string) => void }) {
  const { t } = useI18n()
  const picked = useRef(false)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={t('query.examples')}
          aria-label={t('query.examples')}
          className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground mr-0.5 flex size-6 shrink-0 items-center justify-center rounded-md transition-colors"
        >
          <Lightbulb className="size-3.5" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80"
        // Radix returns focus to the trigger on close. After a pick, send it to
        // the query instead, so Enter runs the example rather than reopening this.
        onCloseAutoFocus={(event) => {
          if (!picked.current) return
          picked.current = false
          event.preventDefault()
          document.getElementById(QUERY_INPUT_ID)?.focus()
        }}
      >
        <p className="text-muted-foreground px-2 pt-1 pb-1.5 text-xs">{t('query.examplesHint')}</p>
        {QUERY_KINDS.map((kind, index) => (
          <div key={kind}>
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{t(kind === 'jsonpath' ? 'query.jsonpath' : 'query.javascript')}</DropdownMenuLabel>
            {EXAMPLES[kind].map((example) => (
              <DropdownMenuItem
                key={example}
                onSelect={() => {
                  picked.current = true
                  onPick(kind, example)
                }}
                className="font-mono text-xs"
              >
                <span className="truncate">{example}</span>
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function QueryBar() {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [kind, setKindState] = useState<QueryKind>(() => readPreference(QUERY_KIND_KEY, QUERY_KINDS, 'javascript'))
  const runQuery = useEditorStore((state) => state.runQuery)
  const activeKind = useActiveTabKind()
  const focusBinding = useKeybindingsStore((state) => state.bindingFor('query.focus'))

  const setKind = (next: QueryKind) => {
    writePreference(QUERY_KIND_KEY, next)
    setKindState(next)
  }

  const submit = () => {
    if (query.trim()) runQuery(query, kind)
  }

  // A query runs against one JSON Document; a comparison holds two.
  if (activeKind !== 'document') return null

  return (
    <div className="bg-surface-raised flex h-10 items-center gap-1.5 border-b px-1.5">
      {/* A soft tinted pill rather than a hard-bordered box: contained enough
          to read as one field, quiet enough to sit inside the chrome. Focus
          turns it into a page-coloured field with a brand-blue border. */}
      <div className="bg-muted/50 hover:bg-muted/70 focus-within:bg-background focus-within:hover:bg-background focus-within:border-primary flex h-8 min-w-0 flex-1 items-center rounded-lg border border-transparent pr-1 pl-1 transition-[background-color,border-color] duration-200">
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
          className="placeholder:text-muted-foreground/60 h-full min-w-0 flex-1 border-0 bg-transparent px-2 font-mono text-[13px] shadow-none focus-visible:border-transparent dark:bg-transparent"
          spellCheck={false}
          autoComplete="off"
        />

        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            title={t('query.clear')}
            aria-label={t('query.clear')}
            className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground mr-0.5 flex size-6 shrink-0 items-center justify-center rounded-md transition-colors"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : (
          focusBinding && (
            <KeyCombo binding={focusBinding} className="pointer-events-none mr-1 hidden sm:inline-flex" />
          )
        )}
        <ExamplesMenu
          onPick={(pickedKind, example) => {
            setKind(pickedKind)
            setQuery(example)
          }}
        />
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
