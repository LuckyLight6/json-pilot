import { CircleAlert, CircleCheck, CircleDashed } from 'lucide-react'

import { Badge } from '@/components/ui'
import { useI18n } from '@/i18n'
import { useActiveDocument, useEditorStore } from '@/store/editor-store'

/** Document health at a glance; clicking an error count jumps to it. */
export function JsonStatusBadge() {
  const { t } = useI18n()
  const document = useActiveDocument()
  const isEmpty = (document?.value ?? '').trim().length === 0
  const errorCount = useEditorStore((state) => state.errors.length)
  const goToFirstError = useEditorStore((state) => state.goToFirstError)

  if (!document) return null

  if (isEmpty) {
    return (
      <Badge variant="outline" className="text-muted-foreground h-5 gap-1 rounded-full px-2 font-mono text-[10px] font-normal">
        <CircleDashed aria-hidden />
        {t('status.empty')}
      </Badge>
    )
  }

  if (errorCount === 0) {
    return (
      <Badge variant="outline" className="h-5 gap-1 rounded-full border-emerald-500/30 bg-emerald-500/10 px-2 font-mono text-[10px] font-normal text-emerald-600 dark:text-emerald-400">
        <CircleCheck aria-hidden />
        {t('status.valid')}
      </Badge>
    )
  }

  return (
    <Badge asChild variant="destructive" className="h-5 cursor-pointer gap-1 rounded-full px-2 font-mono text-[10px] font-normal tabular-nums">
      <button type="button" title={t('status.jumpToError')} onClick={goToFirstError}>
        <CircleAlert aria-hidden />
        {errorCount === 1 ? t('status.errorsOne') : t('status.errors', { count: errorCount })}
      </button>
    </Badge>
  )
}
