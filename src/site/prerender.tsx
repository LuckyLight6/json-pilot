import { renderToString } from 'react-dom/server'

import { SiteApp } from './site-app'

import type { Locale } from '@/i18n'

/** The site's markup in one language, rendered at build time by `scripts/prerender.mjs`. */
export function render(locale: Locale): string {
  return renderToString(<SiteApp locale={locale} />)
}
