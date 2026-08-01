import Editor, { type OnMount, type OnValidate } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useMemo } from 'react'

import { CODE_EDITOR_OPTIONS } from './options'
import './setup'

import { useI18n } from '@/i18n'

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
}

function EditorFallback({ label }: { label: string }) {
  return <div className="text-muted-foreground p-4 text-sm">{label}</div>
}

export function CodeEditor({ path, value, theme, onChange, onMount, onValidate, options }: CodeEditorProps) {
  const { t } = useI18n()
  // Monaco calls `updateOptions` whenever this object identity changes.
  const mergedOptions = useMemo(() => ({ ...CODE_EDITOR_OPTIONS, ...options }), [options])

  return (
    <Editor
      path={path}
      height="100%"
      language="json"
      value={value}
      theme={theme}
      // Models outlive the component: tab lifetime is ours to manage, and the
      // library's default is to dispose the model on unmount.
      keepCurrentModel
      loading={<EditorFallback label={t('editor.loading')} />}
      options={mergedOptions}
      onChange={(next) => onChange?.(next ?? '')}
      onMount={onMount}
      onValidate={onValidate}
    />
  )
}
