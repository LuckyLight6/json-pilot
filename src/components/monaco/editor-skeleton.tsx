import { useI18n } from '@/i18n'

/**
 * Stands in for an editor while the Monaco chunk downloads. Deliberately empty
 * — no fake lines — because the empty-state card may sit on top of it, and a
 * thin indeterminate bar is enough to say "working" without competing.
 */
export function EditorSkeleton() {
  const { t } = useI18n()
  return (
    <div className="relative h-full overflow-hidden" role="status" aria-busy="true">
      <div className="editor-loading-bar" aria-hidden />
      <span className="sr-only">{t('editor.loading')}</span>
    </div>
  )
}
