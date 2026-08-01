import type { DiffOnMount } from '@monaco-editor/react'
import { editor as monacoEditor, type editor } from 'monaco-editor'
import { useCallback, useEffect, useMemo } from 'react'

import type { CommandId } from '@/commands/registry'
import { CompareContextMenu, DocumentContextMenu } from '@/components/editor-context-menu'
import { CodeEditor } from '@/components/monaco/code-editor'
import { DiffEditor } from '@/components/monaco/diff-editor'
import { Button } from '@/components/ui'
import { useI18n } from '@/i18n'
import { formatBinding, isMacPlatform } from '@/lib/shortcuts'
import { compareUri, documentUri, tabIdFromUri } from '@/lib/tabs'
import { cn } from '@/lib/utils'
import {
  useActiveTab,
  useDocumentToRender,
  useEditorStore,
  useTabIds,
  type CompareTab,
} from '@/store/editor-store'
import { useKeybindingsStore } from '@/store/keybindings-store'
import { useWordWrap } from '@/store/preferences-store'
import { useMonacoTheme } from '@/theme'

const IS_MAC = isMacPlatform()

function ShortcutHint({ command, label }: { command: CommandId; label: string }) {
  const binding = useKeybindingsStore((state) => state.bindingFor(command))
  if (!binding) return null
  return (
    <span className="flex items-center justify-between gap-6">
      <span className="text-muted-foreground text-xs">{label}</span>
      <kbd className="kbd-hint">{formatBinding(binding, IS_MAC)}</kbd>
    </span>
  )
}

function EmptyState() {
  const { t } = useI18n()
  const loadSample = useEditorStore((state) => state.loadSample)

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
      <div className="animate-in fade-in slide-in-from-bottom-2 pointer-events-auto w-full max-w-xs space-y-4 text-center duration-300">
        <div className="space-y-1.5">
          <p className="text-foreground text-sm font-medium">{t('empty.title')}</p>
          <p className="text-muted-foreground text-xs leading-relaxed">{t('empty.hint')}</p>
        </div>
        <div className="bg-surface-raised border-border/70 flex flex-col gap-2.5 rounded-xl border p-3.5 text-left shadow-sm">
          <ShortcutHint command="document.loadSample" label={t('empty.loadSample')} />
          <ShortcutHint command="query.focus" label={t('query.focus')} />
          <ShortcutHint command="app.showShortcuts" label={t('empty.allShortcuts')} />
        </div>
        <Button size="sm" onClick={loadSample} className="h-7 text-xs">
          {t('empty.loadSample')}
        </Button>
      </div>
    </div>
  )
}

function CompareWorkspace({ tab }: { tab: CompareTab }) {
  const { t } = useI18n()
  const theme = useMonacoTheme()
  const wordWrap = useWordWrap()
  const attachDiffEditor = useEditorStore((state) => state.attachDiffEditor)
  const detachDiffEditor = useEditorStore((state) => state.detachDiffEditor)

  const handleMount: DiffOnMount = useCallback(
    (instance, monaco) => {
      attachDiffEditor(instance, monaco)
      instance.onDidDispose(() => detachDiffEditor(instance))
    },
    [attachDiffEditor, detachDiffEditor],
  )

  return (
    <div className="flex h-full flex-col">
      <div className="bg-surface-raised text-muted-foreground grid h-7 grid-cols-2 items-stretch border-b text-[10px] font-medium tracking-wider uppercase">
        <span className="flex items-center border-r px-3">{t('diff.original')}</span>
        <span className="flex items-center px-3">{t('diff.modified')}</span>
      </div>
      <div className="min-h-0 flex-1">
        <CompareContextMenu>
          <DiffEditor
            original={tab.left}
            modified={tab.right}
            originalPath={compareUri(tab.id, 'left')}
            modifiedPath={compareUri(tab.id, 'right')}
            theme={theme}
            wordWrap={wordWrap}
            onMount={handleMount}
          />
        </CompareContextMenu>
      </div>
    </div>
  )
}

function DocumentWorkspace({ tabId, value }: { tabId: string; value: string }) {
  const theme = useMonacoTheme()
  const wordWrap = useWordWrap()
  const activeTabId = useEditorStore((state) => state.activeTabId)
  const refreshFoldMarkers = useEditorStore((state) => state.refreshFoldMarkers)
  const setValue = useEditorStore((state) => state.setValue)
  const setErrors = useEditorStore((state) => state.setErrors)
  const setCursor = useEditorStore((state) => state.setCursor)
  const attachEditor = useEditorStore((state) => state.attachEditor)
  const detachEditor = useEditorStore((state) => state.detachEditor)
  const syncActiveModel = useEditorStore((state) => state.syncActiveModel)
  const toggleFoldOnLine = useEditorStore((state) => state.toggleFoldOnLine)

  const options = useMemo(
    () => ({ wordWrap: wordWrap ? ('on' as const) : ('off' as const) }),
    [wordWrap],
  )

  const handleMount = useCallback(
    (instance: editor.IStandaloneCodeEditor) => {
      attachEditor(instance)

      instance.onMouseDown((event) => {
        const { type, position } = event.target
        if (type !== monacoEditor.MouseTargetType.GUTTER_GLYPH_MARGIN || !position) return
        toggleFoldOnLine(position.lineNumber)
      })

      instance.onDidChangeCursorPosition((event) => {
        setCursor({ line: event.position.lineNumber, column: event.position.column })
      })

      // Decorations and markers belong to the model, so both need re-deriving
      // whenever this shared editor is pointed at another tab.
      instance.onDidChangeModel(() => syncActiveModel())

      // Tie teardown to Monaco's own lifecycle. A React effect cleanup also
      // fires on StrictMode's double-invoke, which would null the handles that
      // `onMount` had already installed and never restore them.
      instance.onDidDispose(() => detachEditor(instance))

      instance.focus()
    },
    [attachEditor, detachEditor, setCursor, syncActiveModel, toggleFoldOnLine],
  )

  // Re-derive after commit, not during the store action: coming back from a
  // comparison un-hides this container in the same render, and decorations set
  // while it was still hidden never get painted.
  useEffect(() => {
    refreshFoldMarkers()
  }, [activeTabId, tabId, refreshFoldMarkers])

  return (
    <>
      <DocumentContextMenu>
        <CodeEditor
          path={documentUri(tabId)}
          value={value}
          theme={theme}
          options={options}
          onChange={setValue}
          onMount={handleMount}
          onValidate={setErrors}
        />
      </DocumentContextMenu>
      {!value && <EmptyState />}
    </>
  )
}

/**
 * Disposes models left behind by closed tabs. It runs after commit, once React
 * has already pointed the editor at a surviving tab, and skips anything still
 * attached — disposing an attached model leaves the editor holding a dead one.
 */
function useOrphanModelReaper(tabIds: string[]) {
  useEffect(() => {
    const live = new Set(tabIds)
    for (const model of monacoEditor.getModels()) {
      const owner = tabIdFromUri(model.uri.toString())
      if (owner && !live.has(owner) && !model.isAttachedToEditor()) model.dispose()
    }
  }, [tabIds])
}

export function EditorWorkspace() {
  const { locale } = useI18n()
  const tabIds = useTabIds()
  const activeTab = useActiveTab()
  // The single code editor is never unmounted: `@monaco-editor/react` would
  // dispose its model on the way out. While a comparison is on screen it simply
  // sits hidden, still attached to a document tab.
  const documentTab = useDocumentToRender()
  const refreshFoldMarkers = useEditorStore((state) => state.refreshFoldMarkers)

  useOrphanModelReaper(tabIds)

  // Marker hover text is baked into the decoration, so re-emit it on locale change.
  useEffect(() => refreshFoldMarkers(), [locale, refreshFoldMarkers])

  const isCompare = activeTab?.kind === 'compare'

  return (
    <main className="relative min-h-0 flex-1">
      <div className={cn('h-full', isCompare && 'hidden')}>
        {documentTab && <DocumentWorkspace tabId={documentTab.id} value={documentTab.value} />}
      </div>
      {isCompare && (
        <div className="absolute inset-0">
          <CompareWorkspace tab={activeTab} />
        </div>
      )}
    </main>
  )
}
