import { describe, expect, it } from 'vitest'

import { countLines } from './text'

describe('countLines', () => {
  it('reports no lines for an empty document', () => {
    expect(countLines('')).toBe(0)
  })

  it('counts a single line without a newline', () => {
    expect(countLines('{"a":1}')).toBe(1)
  })

  it('counts every newline, including a trailing one', () => {
    expect(countLines('{\n  "a": 1\n}')).toBe(3)
    expect(countLines('{}\n')).toBe(2)
  })

  it('treats CRLF as one line break', () => {
    expect(countLines('{\r\n}')).toBe(2)
  })
})
