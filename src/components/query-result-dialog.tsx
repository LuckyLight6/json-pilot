import { Copy, FilePlus2 } from 'lucide-react'
import { toast } from 'sonner'

import { CodeEditor } from '@/components/monaco/code-editor'
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
import { useEditorStore } from '@/store/editor-store'
import { useMonacoTheme } from '@/theme'

export function QueryResultDialog() {
  const { t, locale } = useI18n()
  const theme = useMonacoTheme()
  const isQueryOpen = useEditorStore((state) => state.isQueryOpen)
  const queryResult = useEditorStore((state) => state.queryResult)
  const closeQuery = useEditorStore((state) => state.closeQuery)
  const openDocumentTab = useEditorStore((state) => state.openDocumentTab)

  const result = queryResult ?? ''
  const lines = result ? result.split('\n').length : 0
  const format = (count: number) => count.toLocaleString(locale)

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
        <DialogHeader>
          <DialogTitle>{t('query.resultTitle')}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {t('query.resultDescription')}
            <span className="text-muted-foreground/70 font-mono text-[11px] tabular-nums">
              {lines === 1 ? t('status.linesOne') : t('status.lines', { count: format(lines) })}
              {' · '}
              {result.length === 1
                ? t('status.charactersOne')
                : t('status.characters', { count: format(result.length) })}
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted/40 min-h-0 flex-1 overflow-hidden rounded-md border">
          <CodeEditor path="jsonpilot://query-result.json" value={result} theme={theme} options={RESULT_EDITOR_OPTIONS} />
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
