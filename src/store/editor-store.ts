import { MarkerSeverity, Range, editor as monacoEditor, type editor } from 'monaco-editor'
import { toast } from 'sonner'
import { create } from 'zustand'
import { useShallow } from 'zustand/shallow'

import { buildFoldDecorations, findTargetOnLine } from '@/components/monaco/fold-markers'
import { t, type MessageKey } from '@/i18n'
import {
  collectFoldTargets,
  findFoldTargetAtOffset,
  type FoldTarget,
} from '@/lib/json/fold-targets'
import { toggle as toggleNestedStringFold } from '@/lib/json/nested-string-fold'
import { formatQueryValue, runQuery as runJsonQuery, type QueryKind } from '@/lib/json/query'
import { SAMPLE_DOCUMENT } from '@/lib/json/sample'
import * as transform from '@/lib/json/transform'
import type { JsonPath } from '@/lib/json/types'
import { nextActiveAfterClose, normalizeTabName, type TabIdentity } from '@/lib/tabs'

/**
 * Coalesce marker refreshes across typing bursts. Long enough that the
 * transient invalid states mid-edit (an unbalanced brace, a half-typed escape)
 * usually never render as a vanished-then-reappeared marker.
 */
const DECORATION_DELAY_MS = 250

// Imperative Monaco handles. They are not render state, so they live outside the
// store — keeping them here would make every subscriber re-render on attach.
let codeEditor: editor.IStandaloneCodeEditor | null = null
let diffEditor: editor.IStandaloneDiffEditor | null = null
let foldDecorations: editor.IEditorDecorationsCollection | null = null
let decorationTimer: ReturnType<typeof setTimeout> | undefined
/** Fingerprint of the currently rendered fold targets, to skip no-op redraws. */
let renderedTargetsKey = ''
/** Line count at the last marker refresh — a change means lines moved. */
let renderedLineCount = -1

export interface CursorPosition {
  line: number
  column: number
}

export interface DocumentTab extends TabIdentity {
  kind: 'document'
  value: string
}

export interface CompareTab extends TabIdentity {
  kind: 'compare'
  left: string
  right: string
}

export type Tab = DocumentTab | CompareTab

interface EditorState {
  tabs: Tab[]
  activeTabId: string
  /** Live state of the *active* tab only — the editor is shared across tabs. */
  errors: editor.IMarker[]
  cursor: CursorPosition
  foldTargets: FoldTarget[]
  queryResult: string | null
  isQueryOpen: boolean
  nextDocumentSeq: number
  nextCompareSeq: number
}

interface EditorActions {
  attachEditor: (instance: editor.IStandaloneCodeEditor) => void
  /** Ignores instances that are no longer the attached one — see the note below. */
  detachEditor: (instance: editor.IStandaloneCodeEditor) => void
  attachDiffEditor: (instance: editor.IStandaloneDiffEditor, ...rest: unknown[]) => void
  detachDiffEditor: (instance: editor.IStandaloneDiffEditor) => void
  /** Redraw markers when something outside the document changes their labels. */
  refreshFoldMarkers: () => void
  /** Re-read state that belongs to whichever model the editor just switched to. */
  syncActiveModel: () => void

  openDocumentTab: (value?: string) => void
  openCompareTab: () => void
  closeTab: (id: string) => void
  closeOtherTabs: (id: string) => void
  activateTab: (id: string) => void
  renameTab: (id: string, name: string) => void

  setValue: (value: string) => void
  setErrors: (markers: editor.IMarker[]) => void
  setCursor: (cursor: CursorPosition) => void

  format: () => void
  minify: () => void
  escape: () => void
  unescape: () => void
  sortKeys: (direction: transform.SortDirection) => void
  foldAll: () => void
  unfoldAll: () => void
  copy: () => void
  clear: () => void
  loadSample: () => void

  goToFirstError: () => void
  toggleFoldOnLine: (lineNumber: number) => void
  /** Nested String Fold from a right-click, which is offset- not line-granular. */
  toggleFoldAtOffset: (offset: number) => void
  foldTargetAtOffset: (offset: number) => FoldTarget | null
  /** Document offset under a screen point, for right-click targeting. */
  contextOffsetAt: (clientX: number, clientY: number) => number | null

  copySelection: () => void
  cutSelection: () => void
  paste: () => void
  selectAll: () => void

  runQuery: (query: string, kind: QueryKind) => void
  closeQuery: () => void

  swapComparePanes: () => void
  syncComparePanes: () => void
  promoteComparePane: (pane: 'left' | 'right') => void
}

export type EditorStore = EditorState & EditorActions

const TRANSFORM_FAILURE_MESSAGES: Record<transform.TransformFailure, MessageKey> = {
  empty_document: 'notice.emptyDocument',
  invalid_json: 'notice.invalidJson',
  not_an_escaped_string: 'notice.notAnEscapedString',
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function byDocumentOrder(a: editor.IMarker, b: editor.IMarker): number {
  return a.startLineNumber - b.startLineNumber || a.startColumn - b.startColumn
}

let idCounter = 0
/** Monotonic: a recycled id would inherit the closed tab's editor view state. */
function nextTabId(): string {
  idCounter += 1
  return `tab-${idCounter}`
}

function createDocumentTab(seq: number, value = ''): DocumentTab {
  return { id: nextTabId(), kind: 'document', seq, name: null, value }
}

export const useEditorStore = create<EditorStore>((set, get) => {
  const activeTab = (): Tab | null => {
    const { tabs, activeTabId } = get()
    return tabs.find((tab) => tab.id === activeTabId) ?? null
  }

  const activeDocument = (): DocumentTab | null => {
    const tab = activeTab()
    return tab?.kind === 'document' ? tab : null
  }

  const patchTab = <T extends Tab>(id: string, patch: Partial<T>) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? ({ ...tab, ...patch } as Tab) : tab)),
    }))
  }

  /** Redraws Nested String Fold markers from the active document. */
  const refreshFoldMarkers = (force = false) => {
    const model = codeEditor?.getModel()
    const document = activeDocument()
    if (!model || !foldDecorations || !document) return

    const targets = collectFoldTargets(document.value)
    set({ foldTargets: targets })

    // Monaco moves existing decorations along with incremental edits, so a
    // redraw is only needed when reality has diverged — skipping the no-op
    // resets is what keeps the markers from flickering on every keystroke.
    //
    // "Unchanged" must mean positions too, not just the target set: a whole-
    // document rewrite (format, minify, sort) keeps every kind+path while
    // moving every line, and Monaco's tracking is meaningless across it. So
    // compare the freshly computed marker lines against where the live
    // decorations actually ended up, and redraw on any mismatch.
    renderedLineCount = model.getLineCount()
    const key = model.uri.toString() + '|' + targets.map((t2) => `${t2.kind}:${t2.path.join('.')}`).join(',')
    if (!force && key === renderedTargetsKey) {
      // One marker per line, first target wins — mirror buildFoldDecorations.
      const markerLines: number[] = []
      const claimed = new Set<number>()
      for (const target of targets) {
        const line = model.getPositionAt(target.offset).lineNumber
        if (claimed.has(line)) continue
        claimed.add(line)
        markerLines.push(line)
      }
      const inPlace =
        foldDecorations.length === markerLines.length &&
        markerLines.every((line, index) => foldDecorations?.getRange(index)?.startLineNumber === line)
      if (inPlace) return
    }
    renderedTargetsKey = key

    foldDecorations.set(buildFoldDecorations(model, targets))
  }

  const scheduleFoldMarkers = () => {
    clearTimeout(decorationTimer)
    // Edits that change the line count (Enter, deleted lines, an expand or
    // collapse) move markers vertically. Those must be corrected in the SAME
    // task as the edit — a 0ms timer is a macrotask and can land after the
    // next paint, which shows one frame of stale decorations. The debounce is
    // only for same-line typing, where nothing can move vertically.
    const lineCount = codeEditor?.getModel()?.getLineCount() ?? -1
    if (lineCount !== renderedLineCount) {
      refreshFoldMarkers()
      return
    }
    decorationTimer = setTimeout(refreshFoldMarkers, DECORATION_DELAY_MS)
  }

  /** Single write path for the active document: state, then markers. */
  const applyDocument = (value: string) => {
    const document = activeDocument()
    if (!document) return
    patchTab<DocumentTab>(document.id, { value })
    scheduleFoldMarkers()
  }

  /**
   * Rewrites the whole document through Monaco while keeping the user's place.
   *
   * Routing the text through the store alone would make the controlled editor
   * replace its buffer and drop the cursor at the end of the document — so a
   * format or sort would throw the user's position away. Editing the model
   * directly lets us put the selection and scroll back afterwards.
   */
  const applyDocumentPreservingView = (value: string) => {
    const model = codeEditor?.getModel()
    const document = activeDocument()
    if (!codeEditor || !model || !document) {
      applyDocument(value)
      return
    }

    const selection = codeEditor.getSelection()
    const scrollTop = codeEditor.getScrollTop()

    // onChange fires synchronously and syncs the store via setValue.
    codeEditor.executeEdits('transform', [{ range: model.getFullModelRange(), text: value }])
    codeEditor.pushUndoStop()

    if (selection) codeEditor.setSelection(model.validateRange(selection))
    codeEditor.setScrollTop(Math.min(scrollTop, codeEditor.getScrollHeight()))

    // A full-range replace destroys Monaco's decoration tracking outright —
    // every marker collapses toward the document start — and when the rewrite
    // happens to keep the line count (re-indenting, sorting equal-length docs)
    // the line-count heuristic in scheduleFoldMarkers would leave the debounce
    // to fix it a quarter-second later, as a visible bounce. Correct it in the
    // same task, unconditionally.
    clearTimeout(decorationTimer)
    refreshFoldMarkers()
  }

  /** Reports why a transform or query could not run against the document. */
  const reportFailure = (reason: transform.TransformFailure) => {
    const message = t(TRANSFORM_FAILURE_MESSAGES[reason])
    if (reason === 'empty_document') {
      toast.info(message)
      return
    }
    toast.error(message)
    if (reason === 'invalid_json') get().goToFirstError()
  }

  /** Runs a pure transform over the active document and reports failures. */
  const applyTransform = (run: (document: string) => transform.TransformResult) => {
    const document = activeDocument()
    if (!document) return

    const result = run(document.value)
    if (!result.ok) {
      reportFailure(result.reason)
      return
    }
    applyDocumentPreservingView(result.text)
  }

  /**
   * Runs a Monaco editor folding action. Monaco folds line ranges, so a minified
   * document — a single line, however it looks with word wrap on — has nothing to
   * fold and the action is a silent no-op. Say so instead of appearing broken.
   */
  const runFoldingAction = (actionId: string) => {
    const model = codeEditor?.getModel()
    if (!codeEditor || !model) return

    if (model.getLineCount() <= 1) {
      toast.info(t('notice.nothingToFold'))
      return
    }

    const action = codeEditor.getAction(actionId)
    if (!action) {
      toast.error(t('notice.foldUnavailable'))
      return
    }
    void action.run()
  }

  /** Copies the live diff panes back into the store before they are unmounted. */
  const syncComparePanes = () => {
    const tab = activeTab()
    if (!diffEditor || tab?.kind !== 'compare') return
    patchTab<CompareTab>(tab.id, {
      left: diffEditor.getOriginalEditor().getValue(),
      right: diffEditor.getModifiedEditor().getValue(),
    })
  }

  /** Applies a Nested String Fold at `path` through Monaco, so undo still works. */
  const applyFoldToggle = (path: JsonPath) => {
    const model = codeEditor?.getModel()
    const document = activeDocument()
    if (!codeEditor || !model || !document) return

    const result = toggleNestedStringFold(document.value, path)
    if (!result.ok) {
      if (result.reason === 'invalid_embedded_json') toast.error(t('notice.expandFailed'))
      return
    }

    codeEditor.executeEdits(
      'nested-string-fold',
      result.edits.map((edit) => {
        const start = model.getPositionAt(edit.offset)
        const end = model.getPositionAt(edit.offset + edit.length)
        return {
          range: new Range(start.lineNumber, start.column, end.lineNumber, end.column),
          text: edit.content,
        }
      }),
    )
  }

  /** Whichever editor the caret is in: a diff pane while comparing, else the document. */
  const focusedEditor = (): editor.ICodeEditor | null => {
    if (diffEditor) {
      const original = diffEditor.getOriginalEditor()
      const modified = diffEditor.getModifiedEditor()
      if (modified.hasTextFocus()) return modified
      if (original.hasTextFocus()) return original
      return modified
    }
    return codeEditor
  }

  /** The selection, or the whole line when empty — matching VS Code's clipboard. */
  const selectionRange = (): Range | null => {
    const active = focusedEditor()
    const model = active?.getModel()
    const selection = active?.getSelection()
    if (!model || !selection) return null
    if (!selection.isEmpty()) return Range.lift(selection)
    const line = selection.startLineNumber
    return new Range(line, 1, Math.min(line + 1, model.getLineCount()), 1)
  }

  const selectedText = (): string | null => {
    const model = focusedEditor()?.getModel()
    const range = selectionRange()
    return model && range ? model.getValueInRange(range) : null
  }

  const firstTab = createDocumentTab(1)

  return {
    tabs: [firstTab],
    activeTabId: firstTab.id,
    errors: [],
    cursor: { line: 1, column: 1 },
    foldTargets: [],
    queryResult: null,
    isQueryOpen: false,
    nextDocumentSeq: 2,
    nextCompareSeq: 1,

    attachEditor: (instance) => {
      codeEditor = instance
      foldDecorations = instance.createDecorationsCollection()
      refreshFoldMarkers()
    },
    // React can create a second editor before the first one's disposal is
    // observed — StrictMode's double mount does exactly that — so a blind
    // detach would null the handles the new instance just installed.
    detachEditor: (instance) => {
      if (codeEditor !== instance) return
      clearTimeout(decorationTimer)
      foldDecorations?.clear()
      foldDecorations = null
      codeEditor = null
      renderedTargetsKey = ''
      renderedLineCount = -1
    },
    attachDiffEditor: (instance) => {
      diffEditor = instance
    },
    detachDiffEditor: (instance) => {
      if (diffEditor !== instance) return
      syncComparePanes()
      diffEditor = null
    },
    refreshFoldMarkers: () => refreshFoldMarkers(true),

    // Markers and decorations belong to a model, so both have to be re-derived
    // when the shared editor is pointed at a different tab. `onValidate` stays
    // silent on a switch — nothing about the markers changed, only which model
    // is on screen — so read them back explicitly.
    syncActiveModel: () => {
      const model = codeEditor?.getModel()
      if (!model) return
      foldDecorations?.clear()
      get().setErrors(monacoEditor.getModelMarkers({ resource: model.uri }))
      const position = codeEditor?.getPosition()
      if (position) set({ cursor: { line: position.lineNumber, column: position.column } })
      refreshFoldMarkers()
    },

    openDocumentTab: (value = '') => {
      syncComparePanes()
      const tab = createDocumentTab(get().nextDocumentSeq, value)
      set((state) => ({
        tabs: [...state.tabs, tab],
        activeTabId: tab.id,
        nextDocumentSeq: state.nextDocumentSeq + 1,
      }))
    },

    openCompareTab: () => {
      syncComparePanes()
      const source = activeDocument()
      const tab: CompareTab = {
        id: nextTabId(),
        kind: 'compare',
        seq: get().nextCompareSeq,
        name: null,
        left: source?.value ?? '',
        right: '',
      }
      set((state) => ({
        tabs: [...state.tabs, tab],
        activeTabId: tab.id,
        nextCompareSeq: state.nextCompareSeq + 1,
      }))
    },

    closeTab: (id) => {
      const { tabs, activeTabId } = get()
      if (tabs.length === 1) {
        // Never leave the workspace empty: reset the last tab instead of closing it.
        const replacement = createDocumentTab(get().nextDocumentSeq)
        set((state) => ({
          tabs: [replacement],
          activeTabId: replacement.id,
          nextDocumentSeq: state.nextDocumentSeq + 1,
        }))
        return
      }

      if (id === activeTabId) syncComparePanes()
      const nextActive = id === activeTabId ? nextActiveAfterClose(tabs.map((tab) => tab.id), id) : activeTabId
      set({
        tabs: tabs.filter((tab) => tab.id !== id),
        activeTabId: nextActive ?? tabs[0].id,
      })
    },

    closeOtherTabs: (id) => {
      const { tabs } = get()
      if (tabs.length <= 1) return
      if (id !== get().activeTabId) syncComparePanes()
      set({ tabs: tabs.filter((tab) => tab.id === id), activeTabId: id })
    },

    activateTab: (id) => {
      if (id === get().activeTabId) return
      syncComparePanes()
      // Fold targets are re-derived by an effect in the workspace once the
      // container is visible again — doing it here would run while the editor
      // is still hidden and the glyphs would never be painted.
      set({ activeTabId: id, errors: [] })
    },

    renameTab: (id, name) => patchTab(id, { name: normalizeTabName(name) }),

    setValue: (value) => {
      const document = activeDocument()
      if (!document || value === document.value) return
      applyDocument(value)
    },
    setErrors: (markers) =>
      set({
        errors: markers.filter((marker) => marker.severity === MarkerSeverity.Error).sort(byDocumentOrder),
      }),
    setCursor: (cursor) => set({ cursor }),

    format: () => applyTransform(transform.format),
    minify: () => applyTransform(transform.minify),
    escape: () => applyTransform(transform.escape),
    unescape: () => applyTransform(transform.unescape),
    sortKeys: (direction) => applyTransform((document) => transform.sortKeys(document, direction)),
    foldAll: () => runFoldingAction('editor.foldAll'),
    unfoldAll: () => runFoldingAction('editor.unfoldAll'),

    copy: () => {
      const document = activeDocument()
      if (!document?.value) {
        toast.info(t('notice.emptyDocument'))
        return
      }
      navigator.clipboard.writeText(document.value).then(
        () => toast.success(t('notice.copied')),
        (error: unknown) => toast.error(t('notice.copyFailed', { message: describe(error) })),
      )
    },
    clear: () => {
      applyDocument('')
      toast.success(t('notice.cleared'))
    },
    loadSample: () => {
      applyDocument(SAMPLE_DOCUMENT)
      codeEditor?.focus()
    },

    goToFirstError: () => {
      const [firstError] = get().errors
      if (!codeEditor || !firstError) return

      const position = { lineNumber: firstError.startLineNumber, column: firstError.startColumn }
      codeEditor.revealPositionInCenter(position)
      codeEditor.setPosition(position)
      codeEditor.focus()
    },

    toggleFoldOnLine: (lineNumber) => {
      const model = codeEditor?.getModel()
      if (!model) return
      const { foldTargets } = get()
      const target = foldTargets[findTargetOnLine(model, foldTargets, lineNumber)]
      if (target) applyFoldToggle(target.path)
    },

    toggleFoldAtOffset: (offset) => {
      const target = get().foldTargetAtOffset(offset)
      if (target) applyFoldToggle(target.path)
    },

    foldTargetAtOffset: (offset) => {
      const document = activeDocument()
      return document ? findFoldTargetAtOffset(document.value, offset) : null
    },

    contextOffsetAt: (clientX, clientY) => {
      const model = codeEditor?.getModel()
      const target = codeEditor?.getTargetAtClientPoint(clientX, clientY)
      if (!model || !target?.position) return null
      return model.getOffsetAt(target.position)
    },

    copySelection: () => {
      const text = selectedText()
      if (text === null) return
      navigator.clipboard.writeText(text).then(
        () => toast.success(t('notice.copied')),
        (error: unknown) => toast.error(t('notice.copyFailed', { message: describe(error) })),
      )
    },

    cutSelection: () => {
      const active = focusedEditor()
      const text = selectedText()
      const range = selectionRange()
      if (!active || text === null || !range) return
      // Write first: deleting before the clipboard resolves would lose the text
      // if the browser denies the write.
      navigator.clipboard.writeText(text).then(
        () => active.executeEdits('context-menu', [{ range, text: '' }]),
        (error: unknown) => toast.error(t('notice.copyFailed', { message: describe(error) })),
      )
    },

    paste: () => {
      const active = focusedEditor()
      if (!active) return
      if (!navigator.clipboard?.readText) {
        toast.error(t('notice.pasteUnavailable'))
        return
      }
      navigator.clipboard.readText().then(
        (text) => {
          if (!text) return
          active.focus()
          // `paste` (not executeEdits) so undo stops and multi-cursor behave.
          active.trigger('context-menu', 'paste', { text })
        },
        () => toast.error(t('notice.pasteDenied')),
      )
    },

    selectAll: () => {
      const active = focusedEditor()
      const model = active?.getModel()
      if (!active || !model) return
      active.setSelection(model.getFullModelRange())
      active.focus()
    },

    runQuery: (query, kind) => {
      const document = activeDocument()
      if (!document) return

      const result = runJsonQuery(document.value, query, kind)
      if (!result.ok) {
        if (result.reason === 'query_failed') {
          toast.error(t('notice.queryFailed', { message: result.message }))
        } else {
          reportFailure(result.reason)
        }
        return
      }
      set({ queryResult: formatQueryValue(result.value), isQueryOpen: true })
    },
    closeQuery: () => set({ isQueryOpen: false }),

    syncComparePanes,

    swapComparePanes: () => {
      const tab = activeTab()
      if (!diffEditor || tab?.kind !== 'compare') return

      // Swap the models rather than their text, so both undo stacks survive.
      const models = diffEditor.getModel()
      if (!models) return
      diffEditor.setModel({ original: models.modified, modified: models.original })
      patchTab<CompareTab>(tab.id, { left: tab.right, right: tab.left })
    },

    promoteComparePane: (pane) => {
      syncComparePanes()
      const tab = activeTab()
      if (tab?.kind !== 'compare') return

      const source = get().tabs.find((candidate) => candidate.id === tab.id) as CompareTab
      get().openDocumentTab(pane === 'left' ? source.left : source.right)
    },
  }
})

export function useTabIds(): string[] {
  return useEditorStore(useShallow((state) => state.tabs.map((tab) => tab.id)))
}

export function useTab(id: string): Tab | undefined {
  return useEditorStore((state) => state.tabs.find((tab) => tab.id === id))
}

export function useActiveTab(): Tab | undefined {
  return useEditorStore((state) => state.tabs.find((tab) => tab.id === state.activeTabId))
}

/** The active tab when it holds a JSON Document, otherwise null. */
export function useActiveDocument(): DocumentTab | null {
  const tab = useActiveTab()
  return tab?.kind === 'document' ? tab : null
}

/**
 * The document the shared code editor should be attached to: the active one, or
 * — while a comparison is on screen — any surviving document tab, so the editor
 * always has a live model to hold on to.
 */
export function useDocumentToRender(): DocumentTab | null {
  return useEditorStore((state) => {
    const active = state.tabs.find((tab) => tab.id === state.activeTabId)
    if (active?.kind === 'document') return active
    return (state.tabs.find((tab) => tab.kind === 'document') as DocumentTab | undefined) ?? null
  })
}
