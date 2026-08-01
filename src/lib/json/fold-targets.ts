import * as jsonc from 'jsonc-parser'

import type { JsonPath } from './types'

export type FoldTargetKind = 'expandable' | 'collapsible'

/**
 * A spot in the JSON Document where Nested String Fold can be toggled.
 * `offset` is where the marker is rendered — the opening quote/brace/bracket.
 */
export interface FoldTarget {
  kind: FoldTargetKind
  offset: number
  path: JsonPath
}

/** True when `text` is a JSON string whose content parses to an object or array. */
function holdsNestedJson(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false
  try {
    const parsed = JSON.parse(trimmed)
    return typeof parsed === 'object' && parsed !== null
  } catch {
    return false
  }
}

/**
 * Single pass over the JSON Document collecting every Nested String Fold target.
 *
 * The document root is skipped: it has no parent, so it cannot be folded into a
 * string value. Property names never reach `onLiteralValue` (jsonc reports them
 * through `onObjectProperty`), so no key filtering is needed here.
 */
/**
 * The innermost Nested String Fold target containing `offset`, or null.
 *
 * Unlike `collectFoldTargets` + a line lookup, this is offset-granular, which is
 * what a right-click needs: a formatted line like `"a": { "b": 1 }` holds two
 * targets, and a minified document holds all of them on line 1.
 */
export function findFoldTargetAtOffset(document: string, offset: number): FoldTarget | null {
  const root = jsonc.parseTree(document)
  if (!root) return null

  let node = jsonc.findNodeAtOffset(root, offset, true)
  while (node) {
    // A property name reports the same path as its value; only the value folds.
    const isPropertyName = node.parent?.type === 'property' && node.parent.children?.[0] === node
    if (!isPropertyName) {
      const path = jsonc.getNodePath(node)
      if (path.length > 0) {
        if (node.type === 'string' && typeof node.value === 'string' && holdsNestedJson(node.value)) {
          return { kind: 'expandable', offset: node.offset, path }
        }
        if (node.type === 'object' || node.type === 'array') {
          return { kind: 'collapsible', offset: node.offset, path }
        }
      }
    }
    node = node.parent
  }

  return null
}

export function collectFoldTargets(document: string): FoldTarget[] {
  const targets: FoldTarget[] = []

  jsonc.visit(document, {
    onLiteralValue: (value, offset, _length, _line, _character, pathSupplier) => {
      if (typeof value !== 'string' || !holdsNestedJson(value)) return
      const path = pathSupplier()
      if (path.length === 0) return
      targets.push({ kind: 'expandable', offset, path })
    },
    onObjectBegin: (offset, _length, _line, _character, pathSupplier) => {
      const path = pathSupplier()
      if (path.length === 0) return
      targets.push({ kind: 'collapsible', offset, path })
    },
    onArrayBegin: (offset, _length, _line, _character, pathSupplier) => {
      const path = pathSupplier()
      if (path.length === 0) return
      targets.push({ kind: 'collapsible', offset, path })
    },
  })

  return targets
}
