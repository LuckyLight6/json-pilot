import { Range, editor as monacoEditor, type editor } from 'monaco-editor'

import { t } from '@/i18n'
import type { FoldTarget } from '@/lib/json/fold-targets'

/**
 * Nested String Fold markers live in the glyph margin, left of the line numbers.
 *
 * They used to sit inline as zero-width `before` decorations, which reflowed the
 * line every time they were redrawn. The margin is a fixed column, so markers stay
 * put while the document is edited — at the cost of one marker per line, which is
 * all the margin can hold. On a minified single-line document only the outermost
 * target is reachable; format first to expose the rest.
 */
export function buildFoldDecorations(
  model: editor.ITextModel,
  targets: FoldTarget[],
): editor.IModelDeltaDecoration[] {
  const decorations: editor.IModelDeltaDecoration[] = []
  const claimedLines = new Set<number>()

  for (const target of targets) {
    const { lineNumber } = model.getPositionAt(target.offset)
    if (claimedLines.has(lineNumber)) continue
    claimedLines.add(lineNumber)

    decorations.push({
      range: new Range(lineNumber, 1, lineNumber, 1),
      options: {
        glyphMarginClassName: `json-fold-marker json-fold-${target.kind}`,
        glyphMarginHoverMessage: {
          value: t(target.kind === 'expandable' ? 'fold.expandHint' : 'fold.collapseHint'),
        },
        // An insert at column 1 — Enter at the line start, most typically —
        // must push the marker down with its content in the same edit frame.
        // The default stickiness leaves it stranded on the old line until the
        // next refresh, which reads as the marker jumping.
        stickiness: monacoEditor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
      },
    })
  }

  return decorations
}

/** Index of the fold target a glyph-margin click refers to: the first on that line. */
export function findTargetOnLine(
  model: editor.ITextModel,
  targets: FoldTarget[],
  lineNumber: number,
): number {
  return targets.findIndex((target) => model.getPositionAt(target.offset).lineNumber === lineNumber)
}
