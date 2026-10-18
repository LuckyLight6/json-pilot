import Editor, { type OnMount, type OnValidate } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useMemo } from 'react'

import { EditorSkeleton } from './editor-skeleton'
import { CODE_EDITOR_OPTIONS } from './options'
import './setup'

interface CodeEditorProps {
  /**
   * Model URI. Distinct paths give each tab its own text model, and changing it
   * is what swaps the attached model — the library saves and restores view state
   * around the swap.
   */
  path: string
  value: string
  theme: string
  onChange?: (value: string) => void
  onMount?: OnMount
  /** Forwarded to Monaco, which disposes the marker listener for us. */
  onValidate?: OnValidate
  options?: editor.IStandaloneEditorConstructionOptions
  /**
   * Keep the text model alive after unmount (the default), so a tab's buffer
   * and undo history survive. A model that outlives the editor is reused as-is
   * on the next mount and the `value` prop is ignored — so views that show
   * fresh content each time they open must opt out.
   */
  keepModel?: boolean
}

export function CodeEditor({
  path,
  value,
  theme,
  onChange,
  onMount,
  onValidate,
  options,
  keepModel = true,
}: CodeEditorProps) {
  // Monaco calls `updateOptions` whenever this object identity changes.
  const mergedOptions = useMemo(() => ({ ...CODE_EDITOR_OPTIONS, ...options }), [options])

  return (
    <Editor
      path={path}
      height="100%"
      language="json"
      value={value}
      theme={theme}
      keepCurrentModel={keepModel}
      loading={<EditorSkeleton />}
      options={mergedOptions}
      onChange={(next) => onChange?.(next ?? '')}
      onMount={onMount}
      onValidate={onValidate}
    />
  )
}
