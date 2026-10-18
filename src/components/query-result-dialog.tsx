import { Copy, FilePlus2 } from 'lucide-react'
import { toast } from 'sonner'

import { CodeEditor } from '@/components/monaco/lazy'
import { RESULT_EDITOR_OPTIONS } from '@/components/monaco/options'
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
import { countLines } from '@/lib/text'
import { useEditorStore } from '@/store/editor-store'
import { useMonacoTheme } from '@/theme'

export function QueryResultDialog() {
  const { t, locale } = useI18n()
  const theme = useMonacoTheme()
  const isQueryOpen = useEditorStore((state) => state.isQueryOpen)
  const queryResult = useEditorStore((state) => state.queryResult)
  const closeQuery = useEditorStore((state) => state.closeQuery)
  const openDocumentTab = useEditorStore((state) => state.openDocumentTab)

  const result = queryResult?.text ?? ''
  const lines = countLines(result)
  const format = (count: number) => count.toLocaleString(locale)

  // How much came back, in the units that mean something for this result.
  const matches = queryResult?.matches
  const facts = [
    matches === undefined
      ? null
      : matches === 0
        ? t('query.matchesNone')
        : matches === 1
          ? t('query.matchesOne')
          : t('query.matches', { count: format(matches) }),
    lines === 1 ? t('status.linesOne') : t('status.lines', { count: format(lines) }),
    result.length === 1 ? t('status.charactersOne') : t('status.characters', { count: format(result.length) }),
  ].filter(Boolean)

  const copyResult = () => {
    navigator.clipboard
      .writeText(result)
      .then(() => toast.success(t('notice.copied')))
      .catch((error: unknown) =>
        toast.error(t('notice.copyFailed', { message: error instanceof Error ? error.message : String(error) })),
      )
  }

  const saveAsTab = () => {
    // `undefined` renders as the literal text; a new tab for it makes no sense.
    openDocumentTab(result === 'undefined' ? '' : result)
    closeQuery()
  }

  return (
    <Dialog open={isQueryOpen} onOpenChange={closeQuery}>
      {/* `sm:max-w-3xl` is required: DialogContent's base class caps width at `sm:max-w-lg`. */}
      <DialogContent className="flex h-[70vh] flex-col sm:max-w-3xl">
        <DialogHeader className="min-w-0 gap-2.5">
          <DialogTitle>{t('query.resultTitle')}</DialogTitle>
          {/* The query that produced this, so a surprising result can be checked at a glance. */}
          <DialogDescription asChild>
            <div className="bg-muted/60 flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5">
              <span className="bg-primary/10 text-primary shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px]">
                {t(queryResult?.kind === 'jsonpath' ? 'query.jsonpath' : 'query.javascript')}
              </span>
              <code className="text-foreground min-w-0 truncate font-mono text-xs" title={queryResult?.query}>
                {queryResult?.query}
              </code>
            </div>
          </DialogDescription>
          <p className="text-muted-foreground font-mono text-[11px] tabular-nums">{facts.join(' · ')}</p>
        </DialogHeader>
        <div className="bg-muted/40 min-h-0 flex-1 overflow-hidden rounded-md border">
          {/* A fresh model per opening: a kept one would replay the previous result. */}
          <CodeEditor
            path="jsonpilot://query-result.json"
            value={result}
            theme={theme}
            options={RESULT_EDITOR_OPTIONS}
            keepModel={false}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={saveAsTab} className="gap-1.5">
            <FilePlus2 aria-hidden />
            {t('query.saveAsTab')}
          </Button>
          <Button variant="outline" onClick={copyResult} className="gap-1.5">
            <Copy aria-hidden />
            {t('query.copyResult')}
          </Button>
          <Button onClick={closeQuery}>{t('query.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
