import { describe, expect, it } from 'vitest'

import { collectFoldTargets, findFoldTargetAtOffset } from './fold-targets'

describe('collectFoldTargets', () => {
  it('marks a string that holds a JSON object as expandable', () => {
    const document = '{"meta":"{\\"a\\":1}"}'
    expect(collectFoldTargets(document)).toEqual([
      { kind: 'expandable', offset: document.indexOf('"{\\"'), path: ['meta'] },
    ])
  })

  it('ignores plain strings and stringified primitives', () => {
    expect(collectFoldTargets('{"a":"hello","b":"42","c":"[oops"}')).toEqual([])
  })

  it('never marks property names', () => {
    const targets = collectFoldTargets('{"{\\"a\\":1}":"plain"}')
    expect(targets).toEqual([])
  })

  it('marks nested objects and arrays as collapsible, skipping the root', () => {
    expect(collectFoldTargets('{"a":{"b":1},"c":[1]}')).toEqual([
      { kind: 'collapsible', offset: 5, path: ['a'] },
      { kind: 'collapsible', offset: 17, path: ['c'] },
    ])
  })

  it('reports array elements by index', () => {
    expect(collectFoldTargets('[{"a":1},"[1,2]"]')).toEqual([
      { kind: 'collapsible', offset: 1, path: [0] },
      { kind: 'expandable', offset: 9, path: [1] },
    ])
  })

  it('handles non-Latin keys, which the previous base64 encoding could not', () => {
    expect(collectFoldTargets('{"名字":{"年龄":30}}')).toEqual([
      { kind: 'collapsible', offset: 6, path: ['名字'] },
    ])
  })

  it('returns nothing for an unparseable document', () => {
    expect(collectFoldTargets('not json at all')).toEqual([])
  })
})

describe('findFoldTargetAtOffset', () => {
  it('finds the string under the cursor', () => {
    const document = '{"meta":"{\\"a\\":1}"}'
    const offset = document.indexOf('\\"a')
    expect(findFoldTargetAtOffset(document, offset)).toEqual({
      kind: 'expandable',
      offset: document.indexOf('"{\\"'),
      path: ['meta'],
    })
  })

  it('picks the innermost target when several share a line', () => {
    // `{"b":1}` is nested inside `a`; a click inside it must not report `a`.
    const document = '{"a":{"b":1}}'
    expect(findFoldTargetAtOffset(document, document.indexOf('"b"'))).toMatchObject({
      path: ['a'],
      kind: 'collapsible',
    })
    expect(findFoldTargetAtOffset(document, document.indexOf('"a"'))).toBeNull()
  })

  it('walks out of a primitive to the structure containing it', () => {
    const document = '{"a":{"b":1}}'
    expect(findFoldTargetAtOffset(document, document.indexOf('1'))).toMatchObject({ path: ['a'] })
  })

  it('never reports a property name as a target', () => {
    const document = '{"a":{"b":1}}'
    // Offset 1 is inside the key "a", whose value is the root-level object.
    expect(findFoldTargetAtOffset(document, 1)).toBeNull()
  })

  it('reports nested paths through arrays', () => {
    const document = '{"users":[{"profile":"{\\"age\\":30}"}]}'
    expect(findFoldTargetAtOffset(document, document.indexOf('age'))).toMatchObject({
      kind: 'expandable',
      path: ['users', 0, 'profile'],
    })
  })

  it('returns null outside any foldable value', () => {
    expect(findFoldTargetAtOffset('{"a":1}', 5)).toBeNull()
    expect(findFoldTargetAtOffset('not json', 2)).toBeNull()
  })
})
