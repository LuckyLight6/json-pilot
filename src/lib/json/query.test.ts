import { describe, expect, it } from 'vitest'

import { formatQueryValue, runQuery } from './query'

const DOCUMENT = JSON.stringify({
  total: 3,
  users: [
    { name: 'ada', active: true, age: 36 },
    { name: 'bo', active: false, age: 20 },
  ],
})

function value(query: string, kind: 'jsonpath' | 'javascript' = 'javascript'): unknown {
  const result = runQuery(DOCUMENT, query, kind)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error('expected ok')
  return result.value
}

describe('jsonpath queries', () => {
  it('unwraps a single match', () => {
    expect(value('$.users[0].name', 'jsonpath')).toBe('ada')
  })

  it('keeps multiple matches as a list', () => {
    expect(value('$.users[*].name', 'jsonpath')).toEqual(['ada', 'bo'])
  })

  it('yields undefined when nothing matches', () => {
    expect(value('$.missing', 'jsonpath')).toBeUndefined()
  })
})

describe('javascript queries', () => {
  it('evaluates a plain expression', () => {
    expect(value('data.users.length')).toBe(2)
  })

  it('evaluates a parenthesised expression rather than calling it', () => {
    expect(value('(data.total + 1)')).toBe(4)
  })

  it('prefixes a leading accessor with `data`', () => {
    expect(value('.users[1].name')).toBe('bo')
    expect(value('["total"]')).toBe(3)
  })

  it('applies an arrow function to the document', () => {
    expect(value('d => d.users.filter(u => u.active).map(u => u.name)')).toEqual(['ada'])
  })

  it('applies a function expression to the document', () => {
    expect(value('function (d) { return d.total }')).toBe(3)
  })

  it('reports the thrown message', () => {
    const result = runQuery(DOCUMENT, 'data.nope.deep', 'javascript')
    expect(result).toMatchObject({ ok: false, reason: 'query_failed' })
  })
})

describe('document guards', () => {
  it('rejects an empty document', () => {
    expect(runQuery('  ', '$.a', 'jsonpath')).toEqual({ ok: false, reason: 'empty_document' })
  })

  it('rejects invalid JSON', () => {
    expect(runQuery('{"a":}', '$.a', 'jsonpath')).toEqual({ ok: false, reason: 'invalid_json' })
  })
})

describe('formatQueryValue', () => {
  it('renders undefined explicitly instead of an empty view', () => {
    expect(formatQueryValue(undefined)).toBe('undefined')
  })

  it('pretty-prints structures', () => {
    expect(formatQueryValue({ a: 1 })).toBe('{\n  "a": 1\n}')
  })
})
