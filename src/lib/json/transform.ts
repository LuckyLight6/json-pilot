import * as jsonc from 'jsonc-parser'

import { FORMATTING_OPTIONS } from './types'

export type TransformFailure =
  | 'empty_document'
  | 'invalid_json'
  | 'not_an_escaped_string'

export type TransformResult =
  | { ok: true; text: string }
  | { ok: false; reason: TransformFailure }

export type SortDirection = 'asc' | 'desc'

const TRIVIA_TOKENS = new Set<jsonc.SyntaxKind>([
  jsonc.SyntaxKind.Trivia,
  jsonc.SyntaxKind.LineBreakTrivia,
  jsonc.SyntaxKind.LineCommentTrivia,
  jsonc.SyntaxKind.BlockCommentTrivia,
])

/** Parses a JSON Document, reporting syntax problems instead of throwing. */
function parseStrict(document: string): { ok: true; data: unknown } | { ok: false; reason: TransformFailure } {
  if (!document.trim()) return { ok: false, reason: 'empty_document' }

  const errors: jsonc.ParseError[] = []
  const data = jsonc.parse(document, errors, { allowTrailingComma: true })
  if (errors.length > 0) return { ok: false, reason: 'invalid_json' }

  return { ok: true, data }
}

/** Re-indents the JSON Document, preserving comments and key order. */
export function format(document: string): TransformResult {
  const parsed = parseStrict(document)
  if (!parsed.ok) return parsed

  const edits = jsonc.format(document, undefined, { ...FORMATTING_OPTIONS, eol: '\n' })
  return { ok: true, text: jsonc.applyEdits(document, edits) }
}

/** Strips every whitespace and comment token, leaving values untouched. */
export function minify(document: string): TransformResult {
  const parsed = parseStrict(document)
  if (!parsed.ok) return parsed

  const scanner = jsonc.createScanner(document, false)
  const trivia: [number, number][] = []

  for (let token = scanner.scan(); token !== jsonc.SyntaxKind.EOF; token = scanner.scan()) {
    if (!TRIVIA_TOKENS.has(token)) continue
    const start = scanner.getTokenOffset()
    trivia.push([start, start + scanner.getTokenLength()])
  }

  let text = document
  for (let i = trivia.length - 1; i >= 0; i--) {
    const [start, end] = trivia[i]
    text = text.slice(0, start) + text.slice(end)
  }

  return { ok: true, text }
}

/** Wraps the whole JSON Document into a single escaped JSON string literal. */
export function escape(document: string): TransformResult {
  if (!document) return { ok: false, reason: 'empty_document' }
  return { ok: true, text: JSON.stringify(document) }
}

/** Unwraps a JSON Document that is itself a single escaped JSON string literal. */
export function unescape(document: string): TransformResult {
  if (!document.trim()) return { ok: false, reason: 'empty_document' }

  let parsed: unknown
  try {
    parsed = JSON.parse(document)
  } catch {
    return { ok: false, reason: 'invalid_json' }
  }

  if (typeof parsed !== 'string') return { ok: false, reason: 'not_an_escaped_string' }
  return { ok: true, text: parsed }
}

function sortRecursively(data: unknown, direction: SortDirection): unknown {
  if (Array.isArray(data)) return data.map((item) => sortRecursively(item, direction))

  if (data !== null && typeof data === 'object' && Object.getPrototypeOf(data) === Object.prototype) {
    const entries = Object.entries(data as Record<string, unknown>)
    entries.sort(([a], [b]) => (direction === 'asc' ? a.localeCompare(b) : b.localeCompare(a)))
    return Object.fromEntries(entries.map(([key, value]) => [key, sortRecursively(value, direction)]))
  }

  return data
}

/** Recursively reorders object keys. Comments are dropped — the document is rebuilt. */
export function sortKeys(document: string, direction: SortDirection): TransformResult {
  const parsed = parseStrict(document)
  if (!parsed.ok) return parsed

  const indent = FORMATTING_OPTIONS.insertSpaces ? FORMATTING_OPTIONS.tabSize : '\t'
  return { ok: true, text: JSON.stringify(sortRecursively(parsed.data, direction), null, indent) }
}
