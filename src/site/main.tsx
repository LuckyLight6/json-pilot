import { createRoot } from 'react-dom/client'

import '@/index.css'
import './site.css'

import { SiteApp } from './site-app'

// The build prerenders the page into #root (see scripts/prerender.mjs), so it
// shows before this script arrives. Rendering here replaces that markup with
// the same page, now live; nothing visibly changes.
createRoot(document.getElementById('root')!).render(<SiteApp />)

// Loaded lazily: it is not needed for the first paint.
void import('@/lib/service-worker').then(({ registerServiceWorker }) =>
  registerServiceWorker('./', { warmEditor: true }),
)
