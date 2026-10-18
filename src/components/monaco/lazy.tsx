import { lazy, Suspense, type ComponentProps } from 'react'

import { EditorSkeleton } from './editor-skeleton'

/**
 * The only door into the Monaco chunk. Everything else — the header, tabs,
 * query bar, status bar and empty state — renders without it, so the app paints
 * immediately and the editor streams in behind a skeleton.
 *
 * Both editors come from the same chunk; whichever mounts first pays for it.
 */
const LazyCodeEditor = lazy(() => import('./code-editor').then((module) => ({ default: module.CodeEditor })))
const LazyDiffEditor = lazy(() => import('./diff-editor').then((module) => ({ default: module.DiffEditor })))

export function CodeEditor(props: ComponentProps<typeof LazyCodeEditor>) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <LazyCodeEditor {...props} />
    </Suspense>
  )
}

export function DiffEditor(props: ComponentProps<typeof LazyDiffEditor>) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <LazyDiffEditor {...props} />
    </Suspense>
  )
}
