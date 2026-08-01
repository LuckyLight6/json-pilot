const NAMESPACE = 'json-pilot'

/** Reads a persisted choice, falling back when storage is unavailable or stale. */
export function readPreference<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  try {
    const stored = localStorage.getItem(`${NAMESPACE}.${key}`)
    return allowed.includes(stored as T) ? (stored as T) : fallback
  } catch {
    return fallback
  }
}

/** Persists a choice. Storage can throw in private-mode browsers; never let that break the UI. */
export function writePreference(key: string, value: string): void {
  try {
    localStorage.setItem(`${NAMESPACE}.${key}`, value)
  } catch {
    /* preference simply will not survive a reload */
  }
}
