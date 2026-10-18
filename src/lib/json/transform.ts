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

/** Parses a JSON Document, reporting syntax problems instead of throwing. */
function parseStrict(document: string): { ok: true; data: unknown } | { ok: false; reason: TransformFailure } {
  if (!document.trim()) return { ok: false, reason: 'empty_document' }

  const errors: jsonc.ParseError[] = []
  const data = jsonc.parse(document, errors, { allowTrailingComma: true })
  if (errors.length > 0) return { ok: false, reason: 'invalid_json' }

  return { ok: true, data }
}

/*
 * Minify packs every comment onto the one line; Format unpacks it. A packed
 * comment is a block comment whose text starts with one of these marks:
 *
 *   OWN_LINE      it had a line of its own (may precede any of the others)
 *   `//`          it was that line comment
 *   LINE_ESCAPED  it was a line comment holding the block-comment closer,
 *                 escaped
 *   BLOCK_ESCAPED it was a block comment with line breaks (or a text that
 *                 would look like a mark), escaped
 *
 * Anything else is an ordinary block comment, left alone. Escaping turns a
 * backslash into two, a line break into backslash-n and the closer's slash
 * into backslash-slash, so every packed text reads back exactly.
 */
const OWN_LINE = '\\n'
const LINE_ESCAPED = '\\/'
const BLOCK_ESCAPED = '\\*'

/** `after` is the character the escaped text will follow, so a slash right after a mark's star is escaped too. */
function escapeComment(text: string, after: string): string {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const previous = i === 0 ? after : text[i - 1]
    if (char === '\\') out += '\\\\'
    else if (char === '\r' && text[i + 1] === '\n') continue
    else if (char === '\n' || char === '\r') out += '\\n'
    else if (char === '/' && previous === '*') out += '\\/'
    else out += char
  }
  return out
}

function unescapeComment(text: string): string {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]
    if (char === '\\' && (next === '\\' || next === 'n' || next === '/')) {
      out += next === 'n' ? '\n' : next
      i++
    } else {
      out += char
    }
  }
  return out
}

/** One comment token as Minify writes it: always a single line. */
function packComment(token: jsonc.SyntaxKind, text: string, ownLine: boolean): string {
  const mark = ownLine ? OWN_LINE : ''
  if (token === jsonc.SyntaxKind.LineCommentTrivia) {
    return text.includes('*/') ? `/*${mark}${LINE_ESCAPED}${escapeComment(text.slice(2), '/')}*/` : `/*${mark}${text}*/`
  }
  const content = text.slice(2, -2)
  const plain = !/[\r\n]/.test(content) && !content.startsWith('//') && !content.startsWith('\\')
  return plain ? `/*${mark}${content}*/` : `/*${mark}${BLOCK_ESCAPED}${escapeComment(content, '*')}*/`
}

/** A packed comment's original text, or `null` when it is not packed. */
function unpackComment(body: string): { text: string; ownLine: boolean; line: boolean } | null {
  const ownLine = body.startsWith(OWN_LINE)
  if (ownLine) body = body.slice(OWN_LINE.length)
  if (body.startsWith('//') && !body.includes('\n')) return { text: body, ownLine, line: true }
  if (body.startsWith(LINE_ESCAPED)) return { text: `//${unescapeComment(body.slice(2))}`, ownLine, line: true }
  if (body.startsWith(BLOCK_ESCAPED)) return { text: `/*${unescapeComment(body.slice(2))}*/`, ownLine, line: false }
  return ownLine ? { text: `/*${body}*/`, ownLine, line: false } : null
}

const reindent = (text: string) =>
  jsonc.applyEdits(text, jsonc.format(text, undefined, { ...FORMATTING_OPTIONS, eol: '\n' }))

/**
 * Re-indents the JSON Document, preserving comments and key order — and, for
 * a one-line document such as Minify writes, turning its packed comments back
 * into what they were. A document with line breaks was not minified, so its
 * comments are left exactly as written, even ones that happen to look packed.
 */
export function format(document: string): TransformResult {
  const parsed = parseStrict(document)
  if (!parsed.ok) return parsed

  let text = reindent(document)
  if (!/[\r\n]/.test(document)) {
    const unpacked = unpackComments(text)
    if (unpacked !== text) text = reindent(unpacked)
  }
  return { ok: true, text: indentCommentLines(text) }
}

/**
 * Undoes Minify's comment packing: each packed comment gets its own text back,
 * a line comment its line break after it, and an own-line comment its line.
 */
function unpackComments(text: string): string {
  const scanner = jsonc.createScanner(text, false)
  const edits: jsonc.Edit[] = []
  /** Where the previous unpacked comment ended with a line break of its own. */
  let brokeAt = -1
  for (let token = scanner.scan(); token !== jsonc.SyntaxKind.EOF; token = scanner.scan()) {
    if (token !== jsonc.SyntaxKind.BlockCommentTrivia) continue
    const start = scanner.getTokenOffset()
    const end = start + scanner.getTokenLength()
    const comment = unpackComment(text.slice(start + 2, end - 2))
    if (!comment) continue

    const lineBefore = text.slice(text.lastIndexOf('\n', start - 1) + 1, start)
    const lineEnd = text.indexOf('\n', end)
    const lineAfter = text.slice(end, lineEnd === -1 ? text.length : lineEnd)
    const brokenAlready = brokeAt !== -1 && !text.slice(brokeAt, start).trim()
    const breakAfter = comment.line && lineAfter.trim() !== ''
    edits.push({
      offset: start,
      length: end - start,
      content:
        (comment.ownLine && lineBefore.trim() && !brokenAlready ? '\n' : '') + comment.text + (breakAfter ? '\n' : ''),
    })
    brokeAt = breakAfter ? end : -1
  }
  return edits.length ? jsonc.applyEdits(text, edits) : text
}

/**
 * Puts every comment that starts a line at the depth of the block it sits in.
 * jsonc's formatter leaves a comment that directly follows a `//` comment
 * wherever it found it — after Minify, at the start of the line.
 */
function indentCommentLines(text: string): string {
  const unit = FORMATTING_OPTIONS.insertSpaces ? ' '.repeat(FORMATTING_OPTIONS.tabSize) : '\t'
  const scanner = jsonc.createScanner(text, false)
  const edits: jsonc.Edit[] = []
  let depth = 0
  let lineStart: number | null = 0

  for (let token = scanner.scan(); token !== jsonc.SyntaxKind.EOF; token = scanner.scan()) {
    const offset = scanner.getTokenOffset()
    switch (token) {
      case jsonc.SyntaxKind.Trivia:
        continue
      case jsonc.SyntaxKind.LineBreakTrivia:
        lineStart = offset + scanner.getTokenLength()
        continue
      case jsonc.SyntaxKind.LineCommentTrivia:
      case jsonc.SyntaxKind.BlockCommentTrivia:
        if (lineStart !== null && text.slice(lineStart, offset) !== unit.repeat(depth)) {
          edits.push({ offset: lineStart, length: offset - lineStart, content: unit.repeat(depth) })
        }
        break
      case jsonc.SyntaxKind.OpenBraceToken:
      case jsonc.SyntaxKind.OpenBracketToken:
        depth++
        break
      case jsonc.SyntaxKind.CloseBraceToken:
      case jsonc.SyntaxKind.CloseBracketToken:
        depth--
        break
    }
    lineStart = null
  }
  return edits.length ? jsonc.applyEdits(text, edits) : text
}

/**
 * Puts the whole document on one line, keeping every value and every comment:
 * each comment is packed (see above) so that it fits, and Format unpacks it, so
 * `format(minify(x))` gives a formatted `x` back exactly. A document already on
 * one line has its comments packed already, so they are kept as they are —
 * minifying twice changes nothing. Trailing commas are dropped; they carry
 * nothing.
 *
 * Built in one pass over the tokens: removing trivia by re-slicing the whole
 * string per token was quadratic, and froze the tab for ~18 s on a 1 MB
 * document.
 */
export function minify(document: string): TransformResult {
  const parsed = parseStrict(document)
  if (!parsed.ok) return parsed

  const scanner = jsonc.createScanner(document, false)
  const out: string[] = []
  const alreadyMinified = !/[\r\n]/.test(document)
  let lastToken: jsonc.SyntaxKind | null = null
  let lastComma = -1
  let lineBreak = false

  for (let token = scanner.scan(); token !== jsonc.SyntaxKind.EOF; token = scanner.scan()) {
    if (token === jsonc.SyntaxKind.Trivia) continue
    if (token === jsonc.SyntaxKind.LineBreakTrivia) {
      lineBreak = true
      continue
    }
    const start = scanner.getTokenOffset()
    const text = document.slice(start, start + scanner.getTokenLength())

    if (token === jsonc.SyntaxKind.LineCommentTrivia || token === jsonc.SyntaxKind.BlockCommentTrivia) {
      out.push(alreadyMinified ? text : packComment(token, text, lineBreak && out.length > 0))
      lineBreak = false
      continue
    }
    lineBreak = false

    const closes = token === jsonc.SyntaxKind.CloseBraceToken || token === jsonc.SyntaxKind.CloseBracketToken
    if (closes && lastToken === jsonc.SyntaxKind.CommaToken) out.splice(lastComma, 1)
    if (token === jsonc.SyntaxKind.CommaToken) lastComma = out.length
    out.push(text)
    lastToken = token
  }

  return { ok: true, text: out.join('') }
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

/**
 * Natural order — `item2` before `item10` — from one shared collator.
 * `localeCompare` builds a collator per comparison, which dominated large sorts.
 */
const KEY_COLLATOR = new Intl.Collator(undefined, { numeric: true })

/** True when `text` ends in a `//` comment, which must be followed by a line break. */
function endsWithLineComment(text: string): boolean {
  const scanner = jsonc.createScanner(text, false)
  let last: jsonc.SyntaxKind | null = null
  for (let token = scanner.scan(); token !== jsonc.SyntaxKind.EOF; token = scanner.scan()) {
    if (token !== jsonc.SyntaxKind.Trivia) last = token
  }
  return last === jsonc.SyntaxKind.LineCommentTrivia
}

/** Offsets of the first comma and the first line break after it (or after `from`) in `[from, to)`. */
function separators(document: string, from: number, to: number): { comma: number; lineBreak: number } {
  const scanner = jsonc.createScanner(document.slice(from, to), false)
  let comma = -1
  let lineBreak = -1
  for (let token = scanner.scan(); token !== jsonc.SyntaxKind.EOF; token = scanner.scan()) {
    if (token === jsonc.SyntaxKind.CommaToken && comma === -1) comma = from + scanner.getTokenOffset()
    else if (token === jsonc.SyntaxKind.LineBreakTrivia) {
      lineBreak = from + scanner.getTokenOffset()
      break
    }
  }
  return { comma, lineBreak }
}

/**
 * Recursively reorders object keys, moving each property's comments with it:
 * the comment lines above a property, and the comment after it on the same line.
 * The result is re-indented by `format`.
 *
 * The document is rebuilt from its own text rather than from parsed data, so
 * nothing else changes — not number spellings, not escapes, not comments
 * inside values.
 */
export function sortKeys(input: string, direction: SortDirection): TransformResult {
  // Sorting reads comments' lines, so start from the formatted document —
  // which also unpacks comments that Minify put on one line.
  const formatted = format(input)
  if (!formatted.ok) return formatted
  const document = formatted.text
  const root = jsonc.parseTree(document, [], { allowTrailingComma: true })
  if (!root) return { ok: false, reason: 'invalid_json' }

  const sign = direction === 'asc' ? 1 : -1
  const slice = (from: number, to: number) => document.slice(from, to)
  const end = (node: jsonc.Node) => node.offset + node.length
  /** A comment that runs to the end of the line needs the line break back. */
  const closeLine = (text: string) => (endsWithLineComment(text) ? `${text}\n` : text)

  const rebuild = (node: jsonc.Node): string => {
    const children = node.children ?? []
    if (node.type === 'array') {
      let out = ''
      let cursor = node.offset
      for (const child of children) {
        out += slice(cursor, child.offset) + rebuild(child)
        cursor = end(child)
      }
      return out + slice(cursor, end(node))
    }
    if (node.type !== 'object' || children.length === 0) return slice(node.offset, end(node))

    const close = end(node) - 1
    // Whatever shares the opening brace's line stays with the brace.
    const opening = separators(document, node.offset + 1, children[0].offset).lineBreak
    const head = opening === -1 ? '' : slice(node.offset + 1, opening)
    let leadFrom = opening === -1 ? node.offset + 1 : opening
    let trailingComma = false
    let tail = ''

    const entries = children.map((property, index) => {
      const [key, value] = property.children ?? []
      const next = children[index + 1]
      const regionEnd = next ? next.offset : close
      const { comma, lineBreak } = separators(document, end(property), regionEnd)
      if (!next) trailingComma = comma !== -1
      // Before the comma, and after it up to the end of the line, belongs to this property.
      const afterComma = comma === -1 ? end(property) : comma + 1
      const lineEnd = lineBreak === -1 ? (next ? afterComma : regionEnd) : lineBreak
      const entry = {
        key: String(key?.value ?? ''),
        lead: slice(leadFrom, property.offset),
        body: slice(property.offset, value ? value.offset : end(property)) + (value ? rebuild(value) : ''),
        beforeComma: comma === -1 ? '' : slice(end(property), comma),
        afterComma: slice(afterComma, lineEnd),
      }
      leadFrom = lineEnd
      if (!next) tail = slice(lineEnd, close)
      return entry
    })

    entries.sort((a, b) => sign * KEY_COLLATOR.compare(a.key, b.key))
    const last = entries.length - 1
    const members = entries.map(
      (entry, index) =>
        closeLine(entry.lead) +
        entry.body +
        closeLine(entry.beforeComma) +
        (index < last || trailingComma ? ',' : '') +
        closeLine(entry.afterComma),
    )
    return `{${closeLine(head)}${members.join('')}${tail}}`
  }

  return format(slice(0, root.offset) + rebuild(root) + slice(end(root), document.length))
}
