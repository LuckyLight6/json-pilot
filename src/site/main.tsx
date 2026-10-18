import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@/index.css'
import './site.css'

import { LandingPage } from './landing-page'

import { I18nProvider } from '@/i18n'
import { ThemeProvider } from '@/theme'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <LandingPage />
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>,
)
