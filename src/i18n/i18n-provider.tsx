import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import {
  LOCALE_PREFERENCES,
  resolveLocale,
  setActiveLocale,
  translate,
  type Locale,
  type LocalePreference,
  type MessageKey,
  type MessageParams,
} from './messages'

import { readPreference, writePreference } from '@/lib/local-preference'

const STORAGE_KEY = 'locale'

interface I18nValue {
  /** What the user picked — may be `system`. */
  preference: LocalePreference
  /** The locale actually in use. */
  locale: Locale
  setPreference: (preference: LocalePreference) => void
  t: (key: MessageKey, params?: MessageParams) => string
}

const I18nContext = createContext<I18nValue | null>(null)

function browserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return []
  return navigator.languages ?? [navigator.language]
}

/** `locale` pins the language, for prerendering a page in each one at build time. */
export function I18nProvider({ children, locale: pinned }: { children: React.ReactNode; locale?: Locale }) {
  const [preference, setPreferenceState] = useState<LocalePreference>(
    () => pinned ?? readPreference(STORAGE_KEY, LOCALE_PREFERENCES, 'system'),
  )

  const locale = resolveLocale(preference, browserLanguages())

  // Mirror the locale where non-React callers (the editor store) can read it.
  setActiveLocale(locale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setPreference = useCallback((next: LocalePreference) => {
    writePreference(STORAGE_KEY, next)
    setPreferenceState(next)
  }, [])

  const value = useMemo<I18nValue>(
    () => ({
      preference,
      locale,
      setPreference,
      t: (key, params) => translate(locale, key, params),
    }),
    [preference, locale, setPreference],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used within an I18nProvider')
  return context
}
