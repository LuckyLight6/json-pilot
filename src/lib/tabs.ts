export type TabKind = 'document' | 'compare'

export type ComparePane = 'left' | 'right'

/** The part of a tab that does not depend on React, Monaco or its contents. */
export interface TabIdentity {
  id: string
  kind: TabKind
  /** Per-kind counter behind the derived title. Never reused. */
  seq: number
  /** User-supplied title, or null to derive one from `kind` and `seq`. */
  name: string | null
}

const DOCUMENT_URI_PREFIX = 'jsonpilot://document/'
const COMPARE_URI_PREFIX = 'jsonpilot://compare/'

/**
 * Monaco keys text models by URI, and `@monaco-editor/react` swaps the attached
 * model when the `path` prop changes. Giving every tab a stable, unique URI is
 * what makes one editor able to serve all of them.
 */
export function documentUri(id: string): string {
  return `${DOCUMENT_URI_PREFIX}${id}.json`
}

export function compareUri(id: string, pane: ComparePane): string {
  return `${COMPARE_URI_PREFIX}${id}/${pane}.json`
}

/** Recovers the tab id from either flavour of URI, for routing model events. */
export function tabIdFromUri(uri: string): string | null {
  if (uri.startsWith(DOCUMENT_URI_PREFIX)) {
    return uri.slice(DOCUMENT_URI_PREFIX.length).replace(/\.json$/, '') || null
  }
  if (uri.startsWith(COMPARE_URI_PREFIX)) {
    return uri.slice(COMPARE_URI_PREFIX.length).split('/')[0] || null
  }
  return null
}

/**
 * Which tab to activate once `closingId` goes away: the one to its right, else
 * the one to its left, else nothing. Matches how editors everywhere behave.
 */
export function nextActiveAfterClose(ids: string[], closingId: string): string | null {
  const index = ids.indexOf(closingId)
  if (index === -1) return null
  return ids[index + 1] ?? ids[index - 1] ?? null
}

/** Display title: the user's name if set, otherwise derived from kind and seq. */
export function tabTitle(
  tab: TabIdentity,
  t: (key: 'tab.document' | 'tab.compare', params?: Record<string, string | number>) => string,
): string {
  if (tab.name) return tab.name
  return t(tab.kind === 'compare' ? 'tab.compare' : 'tab.document', { n: tab.seq })
}

/** Trims a user-entered title; empty means "go back to the derived one". */
export function normalizeTabName(input: string): string | null {
  const trimmed = input.trim()
  return trimmed.length > 0 ? trimmed.slice(0, 60) : null
}
