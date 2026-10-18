import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Loaded lazily: it is not needed for the first paint.
void import('@/lib/service-worker').then(({ registerServiceWorker }) => registerServiceWorker('../'))
