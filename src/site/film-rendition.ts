import { readPreference, writePreference } from '@/lib/local-preference'

/**
 * Each intro film comes in two renditions (see scripts/render-promo.mjs): HD,
 * 2240×1400 at about 2.8 Mb/s, for retina screens, and SD, 1280×800 at about
 * 1 Mb/s, which streams where HD would stall — GitHub Pages can manage as
 * little as 1.5 Mb/s from mainland China.
 */
export type Rendition = 'hd' | 'sd'

export const RENDITION_SUFFIX: Record<Rendition, string> = { hd: '', sd: '-sd' }

/** Device pixels across the film above which SD starts to look soft. */
const HD_MIN_PIXELS = 1440
/** HD averages 2.8 Mb/s and peaks higher; this leaves room for dips. */
const HD_MIN_MBPS = 5
/** The film's widest layout, in CSS pixels (the page's max-w-6xl less its padding). */
const FILM_MAX_WIDTH = 1104

type LinkSpeed = 'fast' | 'slow'
const LINK_KEY = 'film-link'
const LINK_SPEEDS = ['fast', 'slow', 'unknown'] as const

export interface LinkFacts {
  /** Device pixels across the film as the page lays it out. */
  filmPixels: number
  saveData: boolean
  /** Speed of a real download from this site on this visit, in Mb/s. */
  measured?: number
  /** What an earlier visit learned about the link to this site. */
  learned?: LinkSpeed
  /** The browser's own estimate, in Mb/s. It covers every site, so it can be far off for this one. */
  reported?: number
}

export function chooseRendition({ filmPixels, saveData, measured, learned, reported }: LinkFacts): Rendition {
  if (saveData || filmPixels <= HD_MIN_PIXELS) return 'sd'
  if (measured !== undefined) return measured >= HD_MIN_MBPS ? 'hd' : 'sd'
  if (learned) return learned === 'fast' ? 'hd' : 'sd'
  return (reported ?? 0) >= HD_MIN_MBPS ? 'hd' : 'sd'
}

interface NetworkInformation {
  saveData?: boolean
  downlink?: number
}

/**
 * The fastest download this visit has made from the site, in Mb/s. Small files
 * say little (their time is mostly round trips), and files from a cache or the
 * service worker say nothing about the link, so those are left out.
 */
function measuredMbps(): number | undefined {
  let fastest: number | undefined
  const entries = [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')]
  for (const entry of entries as PerformanceResourceTiming[]) {
    const seconds = (entry.responseEnd - entry.responseStart) / 1000
    if (
      !entry.name.startsWith(location.origin) ||
      entry.encodedBodySize < 20_000 ||
      entry.transferSize < entry.encodedBodySize ||
      entry.workerStart > 0 ||
      seconds <= 0
    ) {
      continue
    }
    fastest = Math.max(fastest ?? 0, (entry.encodedBodySize * 8) / seconds / 1e6)
  }
  return fastest
}

/**
 * The rendition for this visit. A measured speed is remembered, so later
 * visits, which the service worker serves without downloading, still know it.
 */
export function pickRendition(): Rendition {
  if (typeof window === 'undefined') return 'sd'
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection
  const measured = measuredMbps()
  if (measured !== undefined) writePreference(LINK_KEY, measured >= HD_MIN_MBPS ? 'fast' : 'slow')
  const learned = readPreference(LINK_KEY, LINK_SPEEDS, 'unknown')
  return chooseRendition({
    filmPixels: Math.min(window.innerWidth, FILM_MAX_WIDTH) * window.devicePixelRatio,
    saveData: Boolean(connection?.saveData),
    measured,
    learned: learned === 'unknown' ? undefined : learned,
    reported: connection?.downlink,
  })
}

/** HD could not keep up here, so later visits start on SD. */
export function rememberSlowLink(): void {
  writePreference(LINK_KEY, 'slow')
}
