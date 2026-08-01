import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { readPreference, writePreference } from '@/lib/local-preference'

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

/** `system` first: the app follows the OS palette until the user says otherwise. */
export const THEMES: Theme[] = ['system', 'light', 'dark']

const STORAGE_KEY = 'theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

interface ThemeValue {
  theme: Theme
  /** What is actually on screen — `system` resolved against the OS preference. */
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readPreference(STORAGE_KEY, THEMES, 'system'))
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light',
  )

  // Keep `system` live: the OS palette can flip while the app is open.
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY)
    const onChange = (event: MediaQueryListEvent) => setSystemTheme(event.matches ? 'dark' : 'light')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const resolvedTheme = theme === 'system' ? systemTheme : theme

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  const setTheme = useCallback((next: Theme) => {
    writePreference(STORAGE_KEY, next)
    setThemeState(next)
  }, [])

  const value = useMemo<ThemeValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}

/** Monaco's built-in theme ids — `vs` is the light one. */
export function useMonacoTheme(): 'vs' | 'vs-dark' {
  return useTheme().resolvedTheme === 'dark' ? 'vs-dark' : 'vs'
}
