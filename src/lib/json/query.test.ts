import { describe, expect, it } from 'vitest'

import { formatQueryValue, isSingularPath, runQuery } from './query'

const DOCUMENT = JSON.stringify({
  total: 3,
  users: [
    { name: 'ada', active: true, age: 36, tags: ['admin', 'ops'] },
    { name: 'bo', active: false, age: 20, tags: [] },
    { name: 'cy', active: true, age: 41, tags: ['ops'] },
  ],
})

function value(query: string, kind: 'jsonpath' | 'javascript' = 'javascript'): unknown {
  const result = runQuery(DOCUMENT, query, kind)
  expect(result).toMatchObject({ ok: true })
  if (!result.ok) throw new Error('expected ok')
  return result.value
}

describe('isSingularPath', () => {
  it.each(['$', '$.total', '$.users[0].name', "$['a,b']", '$["a:b"].c', "$.users['*']", '$.users[(@.length-1)]'])(
    'treats %s as selecting at most one node',
    (path) => expect(isSingularPath(path)).toBe(true),
  )

  it.each(['$.users[*]', '$.users.*', '$..name', '$.users[?(@.active)]', '$.users[0:2]', '$.users[-1:]', '$.users[0,2]'])(
    'treats %s as a list query',
    (path) => expect(isSingularPath(path)).toBe(false),
  )
})

describe('jsonpath queries', () => {
  it('returns the value itself for a singular path', () => {
    expect(value('$.users[0].name', 'jsonpath')).toBe('ada')
    expect(value('$.users.length', 'jsonpath')).toBe(3)
  })

  it('yields undefined when a singular path matches nothing', () => {
    expect(value('$.missing', 'jsonpath')).toBeUndefined()
  })

  it('keeps multiple matches as a list', () => {
    expect(value('$.users[*].name', 'jsonpath')).toEqual(['ada', 'bo', 'cy'])
  })

  // The shape must follow the path, not the data: a filter is a list query
  // whether it matches two nodes, one or none.
  it('returns a filter result as a list for any number of matches', () => {
    expect(value('$.users[?(@.age > 30)].name', 'jsonpath')).toEqual(['ada', 'cy'])
    expect(value('$.users[?(@.age > 40)].name', 'jsonpath')).toEqual(['cy'])
    expect(value('$.users[?(@.age > 99)]', 'jsonpath')).toEqual([])
  })

  it('returns slices and recursive descent as lists', () => {
    expect(value('$.users[-1:].name', 'jsonpath')).toEqual(['cy'])
    expect(value('$..total', 'jsonpath')).toEqual([3])
  })

  it('supports comparison and method calls in filters', () => {
    expect(value("$.users[?(@.name == 'bo')].age", 'jsonpath')).toEqual([20])
    expect(value("$.users[?(@.tags.includes('ops'))].name", 'jsonpath')).toEqual(['ada', 'cy'])
  })

  it('reports how many nodes matched', () => {
    expect(runQuery(DOCUMENT, '$.users[?(@.active)]', 'jsonpath')).toMatchObject({ ok: true, matches: 2 })
  })

  it('reports a malformed filter', () => {
    expect(runQuery(DOCUMENT, '$.users[?(@.age >)]', 'jsonpath')).toMatchObject({ ok: false, reason: 'query_failed' })
  })
})

describe('javascript queries', () => {
  it('evaluates a plain expression', () => {
    expect(value('data.users.length')).toBe(3)
  })

  it('evaluates a parenthesised expression rather than calling it', () => {
    expect(value('(data.total + 1)')).toBe(4)
  })

  it('prefixes a leading accessor with `data`', () => {
    expect(value('.users[1].name')).toBe('bo')
    expect(value('?.users?.[2]?.name')).toBe('cy')
    expect(value('["total"]')).toBe(3)
  })

  it('reads a leading array literal as an array, not an accessor', () => {
    expect(value('[data.total, data.users.length]')).toEqual([3, 3])
  })

  it('exposes the document as `$` as well as `data`', () => {
    expect(value('$.users.filter(u => u.active).map(u => u.name)')).toEqual(['ada', 'cy'])
  })

  it('applies an arrow function to the document', () => {
    expect(value('d => d.users.filter(u => u.active).map(u => u.name)')).toEqual(['ada', 'cy'])
  })

  it('applies a function expression to the document', () => {
    expect(value('function (d) { return d.total }')).toBe(3)
  })

  it('reads a bare object literal as an object', () => {
    expect(value('{ count: data.users.length }')).toEqual({ count: 3 })
  })

  it('accepts statements with an explicit return', () => {
    expect(value('const active = data.users.filter(u => u.active); return active.length')).toBe(2)
  })

  it('ignores a trailing semicolon', () => {
    expect(value('data.total;')).toBe(3)
  })

  it('refuses a promise instead of rendering it as {}', () => {
    expect(runQuery(DOCUMENT, 'async d => d.total', 'javascript')).toEqual({ ok: false, reason: 'async_result' })
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

  it('queries a document whose root is a primitive', () => {
    expect(runQuery('42', '$', 'jsonpath')).toMatchObject({ ok: true, value: 42 })
    expect(runQuery('42', 'data + 1', 'javascript')).toMatchObject({ ok: true, value: 43 })
  })
})

describe('formatQueryValue', () => {
  it('renders undefined explicitly instead of an empty view', () => {
    expect(formatQueryValue(undefined)).toBe('undefined')
  })

  it('pretty-prints structures', () => {
    expect(formatQueryValue({ a: 1 })).toBe('{\n  "a": 1\n}')
  })

  it('keeps non-finite numbers instead of turning them into null', () => {
    expect(formatQueryValue(Number.NaN)).toBe('NaN')
    expect(formatQueryValue([Infinity])).toBe('[\n  "Infinity"\n]')
  })

  it('renders BigInts, functions, Maps and Sets', () => {
    expect(formatQueryValue(10n)).toBe('10n')
    expect(formatQueryValue(function named() {})).toBe('[Function named]')
    expect(JSON.parse(formatQueryValue(new Map([['a', 1]])))).toEqual({ a: 1 })
    expect(JSON.parse(formatQueryValue(new Set([1, 2])))).toEqual([1, 2])
  })

  it('marks cycles without mistaking shared references for them', () => {
    const shared = { id: 1 }
    expect(JSON.parse(formatQueryValue([shared, shared]))).toEqual([{ id: 1 }, { id: 1 }])

    const looped: Record<string, unknown> = { name: 'loop' }
    looped.self = looped
    expect(JSON.parse(formatQueryValue(looped))).toEqual({ name: 'loop', self: '[Circular]' })
  })
})
