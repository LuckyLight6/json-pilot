import { describe, expect, it } from 'vitest'

import { escape, format, minify, sortKeys, unescape } from './transform'

function expectText(result: ReturnType<typeof format>): string {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error('expected ok')
  return result.text
}

describe('format', () => {
  it('re-indents a minified document with two spaces', () => {
    expect(expectText(format('{"a":1,"b":[1,2]}'))).toBe('{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}')
  })

  it('preserves comments', () => {
    expect(expectText(format('{/* keep */"a":1}'))).toContain('/* keep */')
  })

  it('rejects an empty document', () => {
    expect(format('   ')).toEqual({ ok: false, reason: 'empty_document' })
  })

  it('rejects invalid JSON so the user is pointed at the error', () => {
    expect(format('{"a": 1,BAD}')).toEqual({ ok: false, reason: 'invalid_json' })
  })
})

describe('minify', () => {
  it('removes whitespace between tokens', () => {
    expect(expectText(minify('{\n  "a": 1,\n  "b": [1, 2]\n}'))).toBe('{"a":1,"b":[1,2]}')
  })

  it('leaves whitespace inside string values alone', () => {
    expect(expectText(minify('{ "a": "keep  me" }'))).toBe('{"a":"keep  me"}')
  })

  it('strips comments', () => {
    expect(expectText(minify('{ // note\n "a": 1 }'))).toBe('{"a":1}')
  })
})

describe('escape / unescape', () => {
  it('round-trips a document through a JSON string literal', () => {
    const document = '{"a": 1}'
    const escaped = expectText(escape(document))
    expect(escaped).toBe('"{\\"a\\": 1}"')
    expect(expectText(unescape(escaped))).toBe(document)
  })

  it('refuses to unescape a document that is not a string literal', () => {
    expect(unescape('{"a":1}')).toEqual({ ok: false, reason: 'not_an_escaped_string' })
  })

  it('reports unparseable input', () => {
    expect(unescape('not json')).toEqual({ ok: false, reason: 'invalid_json' })
  })
})

describe('sortKeys', () => {
  it('sorts nested object keys ascending', () => {
    const sorted = expectText(sortKeys('{"b":1,"a":{"d":1,"c":2}}', 'asc'))
    expect(JSON.stringify(JSON.parse(sorted))).toBe('{"a":{"c":2,"d":1},"b":1}')
  })

  it('sorts descending', () => {
    const sorted = expectText(sortKeys('{"a":1,"b":2}', 'desc'))
    expect(JSON.stringify(JSON.parse(sorted))).toBe('{"b":2,"a":1}')
  })

  it('sorts objects inside arrays without reordering the array', () => {
    const sorted = expectText(sortKeys('[{"b":1,"a":2},{"z":1}]', 'asc'))
    expect(JSON.stringify(JSON.parse(sorted))).toBe('[{"a":2,"b":1},{"z":1}]')
  })

  it('rejects invalid JSON instead of silently rewriting it', () => {
    expect(sortKeys('{"a":}', 'asc')).toEqual({ ok: false, reason: 'invalid_json' })
  })
})
