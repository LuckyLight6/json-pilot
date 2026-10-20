/*
 * The service worker, written to dist/sw.js by scripts/service-worker.mjs,
 * which fills in BUILD. Its job is to make the second visit free:
 *
 * - Hashed build assets (scripts, styles, workers, fonts, icons) never change
 *   under the same name, so they are served from the cache once fetched —
 *   including the editor's, which the site fetches ahead (below) and which
 *   the browser's own cache would hold only if the editor had been opened.
 * - Files that keep their name when they change — the film posters, the
 *   install icons — are served from the cache too, but fetched again behind
 *   it, so the next visit sees a new version.
 * - Pages go to the network first, so a deploy shows up at once, and fall back
 *   to the cache when the network is down or too slow.
 * - The product site can ask it to fetch the editor while the visitor reads
 *   ("warm-editor"), so opening the app is instant. The warm-up gives way
 *   while the intro film plays ("film-playing" until "film-stopped"): on a
 *   slow link the two would starve each other.
 * - Films are left alone: they stream with range requests.
 */
const BUILD = self.__BUILD__
const ASSETS = 'json-pilot-assets'
const PAGES = 'json-pilot-pages'
/** Old builds' files are dropped beyond this many cached assets. */
const MAX_ASSETS = 80
/** How long a page request may take before a cached copy is shown instead. */
const PAGE_TIMEOUT_MS = 4000

const root = new URL('./', self.location).href
/** Downloads in progress, so a page asking for a file the warm-up is already fetching shares that download. */
const downloads = new Map()
const warmUp = { wanted: false, held: false, running: null, controller: null }
const isHashed = (url) => url.startsWith(`${root}assets/`)
const isRefreshed = (url) => url.startsWith(`${root}icons/`) || /\/media\/[^/]+\.webp$/.test(url)

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || !request.url.startsWith(root)) return
  if (request.mode === 'navigate') event.respondWith(page(request))
  else if (isHashed(request.url)) event.respondWith(asset(request))
  else if (isRefreshed(request.url)) event.respondWith(refreshed(event))
})

self.addEventListener('message', (event) => {
  if (event.data === 'warm-editor') warmUp.wanted = true
  else if (event.data === 'film-playing') {
    warmUp.held = true
    warmUp.controller?.abort()
  } else if (event.data === 'film-stopped') warmUp.held = false
  else return
  if (warmUp.wanted && !warmUp.held) event.waitUntil(warmEditor())
})

async function asset(request) {
  const cache = await caches.open(ASSETS)
  const cached = await cache.match(request.url)
  if (cached) return cached
  try {
    return (await download(cache, request.url)).clone()
  } catch {
    // The warm-up's download was called off; fetch the file for this page.
    return fetch(request)
  }
}

/** Answers from the cache when it can, and updates the cached copy either way. */
async function refreshed(event) {
  const cache = await caches.open(ASSETS)
  const cached = await cache.match(event.request.url)
  const network = download(cache, event.request.url)
  if (!cached) return (await network).clone()
  event.waitUntil(network.catch(() => {}))
  return cached
}

/** Fetches a file into the cache, joining a download of it already under way. */
function download(cache, url, signal) {
  let pending = downloads.get(url)
  if (!pending) {
    pending = fetch(url, { signal })
      .then(async (response) => {
        if (response.ok && response.type === 'basic') {
          await cache.put(url, response.clone())
          await trim(cache)
        }
        return response
      })
      .finally(() => downloads.delete(url))
    downloads.set(url, pending)
  }
  return pending
}

async function page(request) {
  const cache = await caches.open(PAGES)
  const network = fetch(request).then(async (response) => {
    // A redirected response cannot answer a navigation later, so only plain
    // successes are kept.
    if (response.ok && !response.redirected) await cache.put(request.url, response.clone())
    return response
  })
  const slow = new Promise((resolve) => setTimeout(resolve, PAGE_TIMEOUT_MS))
  try {
    const first = await Promise.race([network, slow])
    if (first) return first
    return (await cache.match(request.url)) ?? (await network)
  } catch {
    return (await cache.match(request.url)) ?? Response.error()
  }
}

/** Fetches the editor's files one by one, so they never crowd out the page. */
function warmEditor() {
  warmUp.running ??= (async () => {
    const cache = await caches.open(ASSETS)
    for (const file of BUILD.editor) {
      const url = `${root}${file}`
      if (warmUp.held) return
      if (await cache.match(url)) continue
      warmUp.controller = new AbortController()
      try {
        await download(cache, url, warmUp.controller.signal)
      } catch {
        return
      }
    }
  })().finally(() => {
    warmUp.running = null
    warmUp.controller = null
  })
  return warmUp.running
}

async function trim(cache) {
  const keys = await cache.keys()
  // Keys come back oldest first; never drop the current build's editor files.
  const keep = new Set(BUILD.editor.map((file) => `${root}${file}`))
  const stale = keys.filter((key) => !keep.has(key.url))
  for (const key of stale.slice(0, Math.max(0, keys.length - MAX_ASSETS))) await cache.delete(key)
}
