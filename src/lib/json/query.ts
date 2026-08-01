import * as jsonc from 'jsonc-parser'
import { JSONPath } from 'jsonpath-plus'

export type QueryKind = 'jsonpath' | 'javascript'

export type QueryResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: 'empty_document' | 'invalid_json' }
  | { ok: false; reason: 'query_failed'; message: string }

/**
 * JSONPath always yields an array of matches. Unwrap the common cases so the
 * result reads like the value the user pointed at rather than a 1-item list.
 */
function unwrapMatches(matches: unknown): unknown {
  if (!Array.isArray(matches)) return matches
  if (matches.length === 0) return undefined
  if (matches.length === 1) return matches[0]
  return matches
}

/**
 * Evaluates a JavaScript expression against the parsed document, exposed as `data`.
 *
 * Three shapes are accepted, resolved by evaluating first and inspecting the value:
 * a plain expression (`data.users.length`), a leading accessor (`.users[0]`), and
 * a callback (`d => d.users`), which is applied to `data`.
 */
function runJavaScript(data: unknown, query: string): QueryResult {
  let expression = query.trim()
  if (expression.startsWith('.') || expression.startsWith('[')) expression = `data${expression}`

  try {
    const evaluate = new Function('data', `"use strict";\nreturn (\n${expression}\n)`)
    const evaluated = evaluate(data)
    return { ok: true, value: typeof evaluated === 'function' ? evaluated(data) : evaluated }
  } catch (error) {
    return { ok: false, reason: 'query_failed', message: toMessage(error) }
  }
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Runs a JSONPath or JavaScript query against the JSON Document source text. */
export function runQuery(document: string, query: string, kind: QueryKind): QueryResult {
  if (!document.trim()) return { ok: false, reason: 'empty_document' }

  const errors: jsonc.ParseError[] = []
  const data = jsonc.parse(document, errors, { allowTrailingComma: true })
  if (errors.length > 0) return { ok: false, reason: 'invalid_json' }

  if (kind === 'javascript') return runJavaScript(data, query)

  try {
    return { ok: true, value: unwrapMatches(JSONPath({ path: query, json: data as object })) }
  } catch (error) {
    return { ok: false, reason: 'query_failed', message: toMessage(error) }
  }
}

/** Renders a query result for the read-only result editor. */
export function formatQueryValue(value: unknown): string {
  return value === undefined ? 'undefined' : JSON.stringify(value, null, 2)
}
