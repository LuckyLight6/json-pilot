import { StrictMode } from 'react'

import { LandingPage } from './landing-page'

import { I18nProvider, type Locale } from '@/i18n'
import { ThemeProvider } from '@/theme'

/**
 * The whole product site. `main.tsx` renders it in the browser;
 * `prerender.tsx` renders it at build time, once per `locale`.
 */
export function SiteApp({ locale }: { locale?: Locale }) {
  return (
    <StrictMode>
      <ThemeProvider>
        <I18nProvider locale={locale}>
          <LandingPage />
        </I18nProvider>
      </ThemeProvider>
    </StrictMode>
  )
}
