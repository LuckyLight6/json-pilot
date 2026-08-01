import * as jsonc from 'jsonc-parser'

import { FORMATTING_OPTIONS, type JsonPath, type TextEdit } from './types'

export type ToggleFailureReason =
  | 'path_not_found'
  | 'not_toggleable'
  | 'invalid_embedded_json'

export type ToggleResult =
  | { ok: true; edits: TextEdit[] }
  | { ok: false; reason: ToggleFailureReason }

/**
 * Nested String Fold: expand a stringified JSON object/array at `path`,
 * or collapse an object/array at `path` into a JSON string value.
 *
 * Returns an Edit List for the host to apply. Does not touch the editor or UI.
 */
export function toggle(document: string, path: JsonPath): ToggleResult {
  const root = jsonc.parseTree(document)
  if (!root) {
    return { ok: false, reason: 'path_not_found' }
  }

  const valueNode = jsonc.findNodeAtLocation(root, path)
  if (!valueNode || !valueNode.parent) {
    return { ok: false, reason: 'path_not_found' }
  }

  const parentNode = valueNode.parent
  if (parentNode.type !== 'property' && parentNode.type !== 'array') {
    return { ok: false, reason: 'not_toggleable' }
  }

  if (valueNode.type === 'string') {
    return expandStringAtPath(document, path, valueNode)
  }

  if (valueNode.type === 'object' || valueNode.type === 'array') {
    return collapseStructure(document, valueNode, parentNode)
  }

  return { ok: false, reason: 'not_toggleable' }
}

function expandStringAtPath(
  document: string,
  path: JsonPath,
  valueNode: jsonc.Node,
): ToggleResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(valueNode.value as string)
  } catch {
    return { ok: false, reason: 'invalid_embedded_json' }
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, reason: 'not_toggleable' }
  }

  const edits = jsonc.modify(document, path, parsed, {
    formattingOptions: FORMATTING_OPTIONS,
  })

  return {
    ok: true,
    edits: edits.map((edit) => ({
      offset: edit.offset,
      length: edit.length,
      content: edit.content,
    })),
  }
}

function collapseStructure(
  document: string,
  valueNode: jsonc.Node,
  parentNode: jsonc.Node,
): ToggleResult {
  const jsonValue = jsonc.getNodeValue(valueNode)
  const jsonString = JSON.stringify(jsonValue)
  const escapedJsonString = JSON.stringify(jsonString)

  if (parentNode.type === 'property') {
    const keyNode = parentNode.children![0]
    const keyText = document.slice(keyNode.offset, keyNode.offset + keyNode.length)
    const newPropertyText = `${keyText}: ${escapedJsonString}`

    return {
      ok: true,
      edits: [
        {
          offset: parentNode.offset,
          length: parentNode.length,
          content: newPropertyText,
        },
      ],
    }
  }

  // Array element: replace only the value, keep surrounding commas/brackets.
  return {
    ok: true,
    edits: [
      {
        offset: valueNode.offset,
        length: valueNode.length,
        content: escapedJsonString,
      },
    ],
  }
}
