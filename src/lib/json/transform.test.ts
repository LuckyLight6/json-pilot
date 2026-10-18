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

  it('indents a comment line that follows a line comment', () => {
    expect(expectText(format('{"c":3// c note\n// tail note\n}'))).toBe('{\n  "c": 3 // c note\n  // tail note\n}')
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

  it('packs comments onto the line: line comments into block comments, own lines marked', () => {
    expect(expectText(minify('{ // note\n  "a": 1, /* kept */ "b": 2 // last\n}'))).toBe(
      '{/*// note*/"a":1,/* kept */"b":2/*// last*/}',
    )
    expect(expectText(minify('{\n  // above a\n  "a": 1\n}'))).toBe('{/*\\n// above a*/"a":1}')
  })

  it('always puts the document on one line', () => {
    const commented = '{\n  // a\n  "a": [\n    1, /* one */\n    // two\n    2\n  ]\n}'
    expect(expectText(minify(commented))).not.toContain('\n')
  })

  it('escapes what a plain packed comment cannot hold', () => {
    // A line comment holding the block-comment closer, and a multi-line block comment.
    expect(expectText(minify('{ // a */ b\n "a": 1 }'))).toBe('{/*\\/ a *\\/ b*/"a":1}')
    expect(expectText(minify('{ /* one\n two */ "a": 1 }'))).toBe('{/*\\* one\\n two */"a":1}')
  })

  it('round-trips a document with multi-line and unusual comments exactly', () => {
    const document = [
      '{',
      '  "service": "checkout",',
      '  /*',
      '  123',
      '  */',
      '  "endpoints": ["/cart"],',
      '  //456',
      '  "limits": { "burst": 50 }, // a */ b',
      '  /* \\n is text here */',
      '  /*\\ starts with a backslash */',
      '  /*// starts with slashes */',
      '  /** ends with a star **/',
      '  "x": 1',
      '}',
    ].join('\n')
    const formatted = expectText(format(document))
    const minified = expectText(minify(formatted))
    expect(minified).not.toContain('\n')
    expect(expectText(format(minified))).toBe(formatted)
  })

  it('settles: applying a transform again, or in another order, changes nothing more', () => {
    const documents = [
      ['{', '  "a": 1, // after a', '  /*', '  123', '  */', '  //456', '  "b": 2', '}'].join('\n'),
      '// header\n{ "z": [1, /* one */ 2], "y": { "q": true } } // footer',
      '{"a":1,"b":[1,2,],}',
    ]
    for (const document of documents) {
      const formatted = expectText(format(document))
      const minified = expectText(minify(formatted))
      const sorted = expectText(sortKeys(formatted, 'asc'))
      expect(expectText(format(formatted))).toBe(formatted)
      expect(expectText(minify(minified))).toBe(minified)
      expect(expectText(minify(expectText(minify(minified))))).toBe(minified)
      expect(expectText(minify(expectText(format(minified))))).toBe(minified)
      expect(expectText(sortKeys(sorted, 'asc'))).toBe(sorted)
      // Minify drops trailing commas, so compare against the document without them.
      const withoutTrailingCommas = expectText(format(expectText(minify(document))))
      expect(expectText(format(expectText(minify(minified))))).toBe(withoutTrailingCommas)
      expect(expectText(sortKeys(minified, 'asc'))).toBe(expectText(sortKeys(withoutTrailingCommas, 'asc')))
    }
  })

  it('leaves comments that only look packed alone in a document that was not minified', () => {
    const document = '{\n  /*// not packed */\n  "a": 1 /*\\n not a mark */\n}'
    expect(expectText(format(document))).toBe(document)
  })

  it('drops trailing commas, comments or not', () => {
    expect(expectText(minify('{ "a": [1, 2,], /* c */ "b": {"c": 3, /* d */}, }'))).toBe(
      '{"a":[1,2],/* c */"b":{"c":3/* d */}}',
    )
  })

  it('round-trips through format back to the exact original', () => {
    const documents = [
      '{\n  // about b\n  "b": 2, // after b\n  "a": 1 // after a\n}',
      [
        '{ // object note',
        '  "z": {',
        '    "y": 1, /* inline y */',
        '    // about x',
        '    "x": [',
        '      1, // one',
        '      /* own line block */',
        '      2',
        '    ]',
        '  },',
        '  "c": 3 // c note',
        '  // tail note',
        '}',
      ].join('\n'),
      '// header\n{\n  "a": 1\n}\n// footer',
      [
        '{',
        '  "service": "checkout",',
        '  "version": 3,',
        '  "enabled": true,',
        '  /*',
        '  123',
        '  */',
        '  "endpoints": [',
        '    "/cart",',
        '    "/orders",',
        '    "/orders/{id}"',
        '  ],',
        '  //456',
        '  "limits": {',
        '    "requestsPerMinute": 600,',
        '    "burst": 50',
        '  },',
        '  // 123',
        '  "lastEvent": {',
        '    "id": "evt_8f21",',
        '    "payload": "{\\"orderId\\":\\"A-1093\\"}"',
        '  }',
        '}',
      ].join('\n'),
    ]
    for (const document of documents) {
      expect(expectText(format(document))).toBe(document)
      const minified = expectText(minify(document))
      expect(minified).not.toContain('\n')
      expect(expectText(format(minified))).toBe(document)
    }
  })

  it('keeps commas and brackets that are inside strings', () => {
    expect(expectText(minify('{ "a": ",]", "b": ",}" }'))).toBe('{"a":",]","b":",}"}')
  })

  it('stays linear on large documents', () => {
    const large = JSON.stringify({ items: Array.from({ length: 20000 }, (_, id) => ({ id, ok: true })) }, null, 2)
    const start = performance.now()
    expect(JSON.parse(expectText(minify(large)))).toEqual(JSON.parse(large))
    expect(performance.now() - start).toBeLessThan(1000)
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

  it('orders numbered keys naturally', () => {
    const sorted = expectText(sortKeys('{"item10":1,"item2":2,"item1":3}', 'asc'))
    expect(Object.keys(JSON.parse(sorted))).toEqual(['item1', 'item2', 'item10'])
  })

  it('rejects invalid JSON instead of silently rewriting it', () => {
    expect(sortKeys('{"a":}', 'asc')).toEqual({ ok: false, reason: 'invalid_json' })
  })

  it('moves comments with their properties', () => {
    const document = '{\n  // about b\n  "b": 2, // after b\n  "a": 1 // after a\n}'
    expect(expectText(sortKeys(document, 'asc'))).toBe(
      '{\n  "a": 1, // after a\n  // about b\n  "b": 2 // after b\n}',
    )
  })

  it('keeps comments on the brace line, at the end and inside values', () => {
    const document = '{ // object\n  "b": [1, /* one */ 2],\n  "a": 1,\n  // the end\n}'
    const sorted = expectText(sortKeys(document, 'asc'))
    expect(sorted.startsWith('{ // object\n  "a": 1,')).toBe(true)
    expect(sorted).toContain('/* one */')
    expect(sorted.trimEnd().endsWith('// the end\n}')).toBe(true)
  })

  it('sorts a minified document with its comments in the right places', () => {
    const document = '{\n  // about b\n  "b": 2, // after b\n  "a": 1 // after a\n}'
    expect(expectText(sortKeys(expectText(minify(document)), 'asc'))).toBe(
      '{\n  "a": 1, // after a\n  // about b\n  "b": 2 // after b\n}',
    )
  })

  it('closes a moved line comment before the next property', () => {
    const sorted = expectText(sortKeys('{"b":1, // note b\n"a":2}', 'asc'))
    expect(sorted).toBe('{\n  "a": 2,\n  "b": 1 // note b\n}')
  })

  it('keeps number spellings and escapes exactly as written', () => {
    const sorted = expectText(sortKeys('{"b":"caf\\u00e9","a":1e3}', 'asc'))
    expect(sorted).toContain('"a": 1e3')
    expect(sorted).toContain('"b": "caf\\u00e9"')
  })
})
