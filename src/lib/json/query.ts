import * as jsonc from 'jsonc-parser'
import { JSONPath } from 'jsonpath-plus'

export type QueryKind = 'jsonpath' | 'javascript'

export type QueryResult =
  | {
      ok: true
      value: unknown
      /** JSONPath only: how many nodes the path selected. */
      matches?: number
    }
  | { ok: false; reason: 'empty_document' | 'invalid_json' | 'async_result' }
  | { ok: false; reason: 'query_failed'; message: string }

/**
 * True when a JSONPath can select at most one node: every segment is a plain
 * key or a single index. Anything that fans out — `*`, `..`, a `?()` filter, a
 * `[a:b]` slice or an `[a,b]` union — makes it a list query.
 *
 * Works on the raw text rather than `JSONPath.toPathArray`, which drops quotes
 * and so cannot tell the key `$['a,b']` from the union `$[a,b]`.
 */
export function isSingularPath(path: string): boolean {
  let quote: string | null = null
  let bracketDepth = 0

  for (let index = 0; index < path.length; index++) {
    const character = path[index]
    if (quote) {
      if (character === '\\') index++
      else if (character === quote) quote = null
      continue
    }
    switch (character) {
      case "'":
      case '"':
        quote = character
        break
      case '[':
        bracketDepth++
        break
      case ']':
        bracketDepth--
        break
      case '*':
      case '?':
        return false
      case '.':
        if (path[index + 1] === '.') return false
        break
      case ':':
      case ',':
        if (bracketDepth > 0) return false
        break
    }
  }
  return true
}

/**
 * Runs a JSONPath. A singular path yields the value itself (or `undefined`);
 * a list query always yields an array — empty when nothing matches.
 *
 * The shape must depend on the path, never on the data: unwrapping by match
 * count turned `$.users[?(@.age > 40)]` into an object when one user matched,
 * an array when two did, and `undefined` when none did.
 */
function runJsonPath(data: unknown, path: string): QueryResult {
  const matches = JSONPath({ path, json: data as object, wrap: true }) as unknown[]
  return {
    ok: true,
    value: isSingularPath(path) ? matches[0] : matches,
    matches: matches.length,
  }
}

/**
 * A leading accessor that should be read against `data`: `.users`, `?.users`,
 * or a bracket holding one key or index — `[0]`, `["total"]`. A bracket holding
 * anything else, like `[data.a, data.b]`, is an array literal and is left alone.
 */
const LEADING_ACCESSOR = /^(?:\??\.(?!\d)|\[\s*(?:-?\d+|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\])/

function compile(source: string): (data: unknown, $: unknown) => unknown {
  try {
    return new Function('data', '$', `"use strict";\nreturn (\n${source}\n)`) as (data: unknown, $: unknown) => unknown
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    // Not a single expression: accept a function body, so statements and an
    // explicit `return` work too — `const ids = data.map(…); return ids.length`.
    return new Function('data', '$', `"use strict";\n${source}`) as (data: unknown, $: unknown) => unknown
  }
}

/**
 * Evaluates JavaScript against the parsed document, exposed as `data` and `$`.
 *
 * Accepted shapes: a plain expression (`data.users.length`), a leading accessor
 * (`.users[0]`, `["total"]`), a callback applied to the document
 * (`d => d.users`), or a function body with an explicit `return`.
 */
function runJavaScript(data: unknown, query: string): QueryResult {
  let source = query.trim().replace(/;+$/, '')
  if (LEADING_ACCESSOR.test(source)) source = `data${source}`

  try {
    const evaluated = compile(source)(data, data)
    const value = typeof evaluated === 'function' ? evaluated(data) : evaluated
    if (isThenable(value)) return { ok: false, reason: 'async_result' }
    return { ok: true, value }
  } catch (error) {
    return { ok: false, reason: 'query_failed', message: toMessage(error) }
  }
}

function isThenable(value: unknown): boolean {
  return typeof (value as { then?: unknown } | null)?.then === 'function'
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
    return runJsonPath(data, query.trim())
  } catch (error) {
    return { ok: false, reason: 'query_failed', message: toMessage(error) }
  }
}

/**
 * Renders a query result for the read-only result editor.
 *
 * JavaScript results are not always JSON, and `JSON.stringify` misreports or
 * rejects the rest: NaN and Infinity become `null`, Maps and Sets become `{}`,
 * BigInts and cycles throw. Each gets an honest rendering instead.
 */
export function formatQueryValue(value: unknown): string {
  switch (typeof value) {
    case 'undefined':
      return 'undefined'
    case 'number':
      return String(value)
    case 'bigint':
      return `${value}n`
    case 'function':
      return `[Function ${value.name || 'anonymous'}]`
    case 'symbol':
      return value.toString()
  }

  // `this` is the object holding `item`, so popping back to it keeps exactly
  // the current path in `ancestors` — shared references are not cycles.
  const ancestors: unknown[] = []
  function replacer(this: unknown, _key: string, item: unknown): unknown {
    if (typeof item === 'bigint') return `${item}n`
    if (typeof item === 'number' && !Number.isFinite(item)) return String(item)
    if (typeof item === 'function') return `[Function ${item.name || 'anonymous'}]`
    if (item instanceof Map) return Object.fromEntries(item)
    if (item instanceof Set) return [...item]
    if (typeof item !== 'object' || item === null) return item
    while (ancestors.length > 0 && ancestors.at(-1) !== this) ancestors.pop()
    if (ancestors.includes(item)) return '[Circular]'
    ancestors.push(item)
    return item
  }

  try {
    return JSON.stringify(value, replacer, 2) ?? String(value)
  } catch (error) {
    return `[Unserializable: ${toMessage(error)}]`
  }
}
