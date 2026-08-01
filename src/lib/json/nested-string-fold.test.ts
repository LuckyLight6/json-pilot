import { applyEdits } from 'jsonc-parser'
import { describe, expect, it } from 'vitest'

import { toggle } from './nested-string-fold'

function applyToggle(document: string, path: (string | number)[]): string {
  const result = toggle(document, path)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error('expected ok')
  return applyEdits(document, result.edits)
}

describe('nested string fold — toggle', () => {
  describe('expand', () => {
    it('expands a property whose value is a stringified object', () => {
      const doc = '{"meta":"{\\"a\\":1}"}'
      const next = applyToggle(doc, ['meta'])
      expect(JSON.parse(next)).toEqual({ meta: { a: 1 } })
    })

    it('expands a stringified array inside a property', () => {
      const doc = '{"items":"[1,2]"}'
      const next = applyToggle(doc, ['items'])
      expect(JSON.parse(next)).toEqual({ items: [1, 2] })
    })

    it('expands a stringified object that is an array element', () => {
      const doc = '["{\\"x\\":true}"]'
      const next = applyToggle(doc, [0])
      expect(JSON.parse(next)).toEqual([{ x: true }])
    })

    it('expands nested path with array index', () => {
      const doc = '{"users":[{"profile":"{\\"age\\":30}"}]}'
      const next = applyToggle(doc, ['users', 0, 'profile'])
      expect(JSON.parse(next)).toEqual({ users: [{ profile: { age: 30 } }] })
    })
  })

  describe('collapse', () => {
    it('collapses a property object into a JSON string', () => {
      const doc = '{"meta":{"a":1}}'
      const next = applyToggle(doc, ['meta'])
      expect(JSON.parse(next)).toEqual({ meta: '{"a":1}' })
    })

    it('collapses a property array into a JSON string', () => {
      const doc = '{"items":[1,2]}'
      const next = applyToggle(doc, ['items'])
      expect(JSON.parse(next)).toEqual({ items: '[1,2]' })
    })

    it('collapses an array element object into a JSON string', () => {
      const doc = '[{"x":true}]'
      const next = applyToggle(doc, [0])
      expect(JSON.parse(next)).toEqual(['{"x":true}'])
    })
  })

  describe('round-trip', () => {
    it('expand then collapse restores equivalent string content for a property', () => {
      const original = { meta: '{"a":1,"b":2}' }
      const doc = JSON.stringify(original)
      const expanded = applyToggle(doc, ['meta'])
      expect(JSON.parse(expanded)).toEqual({ meta: { a: 1, b: 2 } })
      const collapsed = applyToggle(expanded, ['meta'])
      expect(JSON.parse(collapsed)).toEqual({ meta: '{"a":1,"b":2}' })
    })
  })

  describe('failures', () => {
    it('returns path_not_found for a missing path', () => {
      const result = toggle('{"a":1}', ['missing'])
      expect(result).toEqual({ ok: false, reason: 'path_not_found' })
    })

    it('returns path_not_found for empty / unparseable document', () => {
      expect(toggle('', [])).toEqual({ ok: false, reason: 'path_not_found' })
      expect(toggle('not-json', ['a'])).toEqual({ ok: false, reason: 'path_not_found' })
    })

    it('returns path_not_found when targeting the document root (no parent)', () => {
      const result = toggle('{"a":1}', [])
      expect(result).toEqual({ ok: false, reason: 'path_not_found' })
    })

    it('returns invalid_embedded_json for a plain non-JSON string value', () => {
      // value content is the characters h-e-l-l-o, which is not valid JSON text
      const result = toggle('{"name":"hello"}', ['name'])
      expect(result).toEqual({ ok: false, reason: 'invalid_embedded_json' })
    })

    it('returns not_toggleable for a number', () => {
      const result = toggle('{"n":42}', ['n'])
      expect(result).toEqual({ ok: false, reason: 'not_toggleable' })
    })

    it('returns not_toggleable for a stringified primitive JSON value', () => {
      const result = toggle('{"n":"42"}', ['n'])
      expect(result).toEqual({ ok: false, reason: 'not_toggleable' })
    })

    it('returns invalid_embedded_json when string content is not JSON', () => {
      const result = toggle('{"meta":"not-json-{"}', ['meta'])
      expect(result).toEqual({ ok: false, reason: 'invalid_embedded_json' })
    })
  })
})
