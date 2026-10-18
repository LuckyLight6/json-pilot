import { describe, expect, it } from 'vitest'

import { chooseRendition } from './film-rendition'

const RETINA_LAPTOP = 2208

describe('chooseRendition', () => {
  it('keeps small or standard-density films on SD whatever the link', () => {
    expect(chooseRendition({ filmPixels: 1170, saveData: false, measured: 50 })).toBe('sd')
    expect(chooseRendition({ filmPixels: 1104, saveData: false, learned: 'fast' })).toBe('sd')
  })

  it('respects Save-Data', () => {
    expect(chooseRendition({ filmPixels: RETINA_LAPTOP, saveData: true, measured: 50 })).toBe('sd')
  })

  it('trusts a download from this site over everything else', () => {
    expect(chooseRendition({ filmPixels: RETINA_LAPTOP, saveData: false, measured: 1.4, reported: 10 })).toBe('sd')
    expect(chooseRendition({ filmPixels: RETINA_LAPTOP, saveData: false, measured: 12, learned: 'slow' })).toBe('hd')
  })

  it('falls back to what an earlier visit learned, then to the browser estimate', () => {
    expect(chooseRendition({ filmPixels: RETINA_LAPTOP, saveData: false, learned: 'slow', reported: 10 })).toBe('sd')
    expect(chooseRendition({ filmPixels: RETINA_LAPTOP, saveData: false, learned: 'fast' })).toBe('hd')
    expect(chooseRendition({ filmPixels: RETINA_LAPTOP, saveData: false, reported: 10 })).toBe('hd')
    expect(chooseRendition({ filmPixels: RETINA_LAPTOP, saveData: false })).toBe('sd')
  })
})
