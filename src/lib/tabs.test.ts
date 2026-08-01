import { describe, expect, it } from 'vitest'

import {
  compareUri,
  documentUri,
  nextActiveAfterClose,
  normalizeTabName,
  tabIdFromUri,
  tabTitle,
  type TabIdentity,
} from './tabs'

const translate = (key: string, params?: Record<string, string | number>) =>
  key === 'tab.compare' ? `Compare ${params?.n}` : `Document ${params?.n}`

describe('tab URIs', () => {
  it('round-trips a document id', () => {
    expect(tabIdFromUri(documentUri('t7'))).toBe('t7')
  })

  it('round-trips a compare id from either pane', () => {
    expect(tabIdFromUri(compareUri('t7', 'left'))).toBe('t7')
    expect(tabIdFromUri(compareUri('t7', 'right'))).toBe('t7')
  })

  it('gives the two panes of a comparison distinct URIs', () => {
    expect(compareUri('t7', 'left')).not.toBe(compareUri('t7', 'right'))
  })

  it('never confuses a document with a comparison', () => {
    expect(documentUri('t7')).not.toBe(compareUri('t7', 'left'))
  })

  it('returns null for URIs it does not own', () => {
    expect(tabIdFromUri('inmemory://model/1')).toBeNull()
    expect(tabIdFromUri('file:///')).toBeNull()
    expect(tabIdFromUri('')).toBeNull()
  })
})

describe('nextActiveAfterClose', () => {
  it('prefers the tab to the right', () => {
    expect(nextActiveAfterClose(['a', 'b', 'c'], 'b')).toBe('c')
  })

  it('falls back to the tab on the left for the last one', () => {
    expect(nextActiveAfterClose(['a', 'b', 'c'], 'c')).toBe('b')
  })

  it('returns null when the last remaining tab closes', () => {
    expect(nextActiveAfterClose(['a'], 'a')).toBeNull()
  })

  it('returns null for an unknown id', () => {
    expect(nextActiveAfterClose(['a', 'b'], 'zz')).toBeNull()
  })
})

describe('tabTitle', () => {
  const base: TabIdentity = { id: 'a', kind: 'document', seq: 2, name: null }

  it('derives a title per kind and sequence', () => {
    expect(tabTitle(base, translate)).toBe('Document 2')
    expect(tabTitle({ ...base, kind: 'compare', seq: 1 }, translate)).toBe('Compare 1')
  })

  it('prefers a user-supplied name', () => {
    expect(tabTitle({ ...base, name: 'orders payload' }, translate)).toBe('orders payload')
  })
})

describe('normalizeTabName', () => {
  it('trims and keeps a real name', () => {
    expect(normalizeTabName('  orders  ')).toBe('orders')
  })

  it('treats blank input as "use the derived title"', () => {
    expect(normalizeTabName('   ')).toBeNull()
    expect(normalizeTabName('')).toBeNull()
  })

  it('caps absurd titles so the strip stays readable', () => {
    expect(normalizeTabName('x'.repeat(200))).toHaveLength(60)
  })
})
