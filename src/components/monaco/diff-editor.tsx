import { DiffEditor as MonacoDiffEditor, type DiffOnMount } from '@monaco-editor/react'
import { useMemo } from 'react'

import { EditorSkeleton } from './editor-skeleton'
import { DIFF_EDITOR_OPTIONS } from './options'
import './setup'

interface DiffEditorProps {
  /**
   * Seed text only. The panes stay uncontrolled so typing never resets a model:
   * the library pushes `original` with an unguarded `setValue` on every change.
   */
  original: string
  modified: string
  originalPath: string
  modifiedPath: string
  theme: string
  wordWrap: boolean
  onMount: DiffOnMount
}

export function DiffEditor({
  original,
  modified,
  originalPath,
  modifiedPath,
  theme,
  wordWrap,
  onMount,
}: DiffEditorProps) {
  // Monaco copies `diffWordWrap` onto both panes as `wordWrapOverride1`, which
  // outranks `wordWrap`. Set both to the same thing so the two panes agree with
  // each other and with the single-document editor.
  const wrap = wordWrap ? ('on' as const) : ('off' as const)
  const options = useMemo(
    () => ({ ...DIFF_EDITOR_OPTIONS, wordWrap: wrap, diffWordWrap: wrap }),
    [wrap],
  )

  return (
    <MonacoDiffEditor
      height="100%"
      language="json"
      original={original}
      modified={modified}
      originalModelPath={originalPath}
      modifiedModelPath={modifiedPath}
      // Leaving the tab unmounts this editor; the two models must survive it.
      keepCurrentOriginalModel
      keepCurrentModifiedModel
      theme={theme}
      loading={<EditorSkeleton />}
      options={options}
      onMount={onMount}
    />
  )
}
