import { en } from './locales/en'
import { zhCN } from './locales/zh-CN'

export type Locale = 'en' | 'zh-CN'

/** What the user picked. `system` re-resolves from the browser languages. */
export type LocalePreference = 'system' | Locale

/** Every locale must provide exactly these keys — `zh-CN` is typed against it. */
export type Messages = { readonly [K in keyof typeof en]: string }

export type MessageKey = keyof Messages

export type MessageParams = Record<string, string | number>

export const LOCALES: Record<Locale, Messages> = {
  en,
  'zh-CN': zhCN,
}

export const LOCALE_PREFERENCES: LocalePreference[] = ['system', 'en', 'zh-CN']

const PLACEHOLDER = /\{(\w+)\}/g

/** Looks up a message and fills `{name}` placeholders. */
export function translate(locale: Locale, key: MessageKey, params?: MessageParams): string {
  const template = LOCALES[locale][key] ?? en[key]
  if (!params) return template
  return template.replace(PLACEHOLDER, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

/** Maps a preference onto a concrete locale, reading the browser languages for `system`. */
export function resolveLocale(preference: LocalePreference, preferred: readonly string[]): Locale {
  if (preference !== 'system') return preference
  return preferred.some((tag) => tag.toLowerCase().startsWith('zh')) ? 'zh-CN' : 'en'
}

let activeLocale: Locale = 'en'

/** Kept in sync by `I18nProvider` so non-React code can translate too. */
export function setActiveLocale(locale: Locale): void {
  activeLocale = locale
}

/**
 * Translate outside React — the editor store and Monaco decorations need copy
 * but have no access to hooks. Components should use `useI18n().t` instead so
 * they re-render when the locale changes.
 */
export function t(key: MessageKey, params?: MessageParams): string {
  return translate(activeLocale, key, params)
}
