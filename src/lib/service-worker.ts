/** The parts of the Network Information API used here; not every browser has it. */
interface NetworkInformation {
  saveData?: boolean
  effectiveType?: string
}

/** True when the visitor saves data or is on a 2G-class connection. */
export function constrainedConnection(): boolean {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection
  return Boolean(connection?.saveData || /2g/.test(connection?.effectiveType ?? ''))
}

/**
 * Registers the service worker (`scripts/service-worker.js`) in production
 * builds; `root` is the path from the page to the site root. The product site
 * passes `warmEditor`: once the page has settled, the worker fetches the
 * editor in the background, so opening the app is instant — unless the
 * connection is constrained.
 */
export function registerServiceWorker(root: string, { warmEditor = false } = {}): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  const register = () => {
    navigator.serviceWorker
      .register(`${root}sw.js`)
      .then(async () => {
        if (!warmEditor || constrainedConnection()) return
        const registration = await navigator.serviceWorker.ready
        // A few quiet seconds first, so warming never competes with the page.
        setTimeout(() => registration.active?.postMessage('warm-editor'), 4000)
      })
      .catch(() => {})
  }
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}
