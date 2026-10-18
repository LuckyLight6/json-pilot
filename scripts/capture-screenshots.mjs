#!/usr/bin/env node
/**
 * Captures the editor screenshots used by the README and the social card.
 *
 *   pnpm dev                                # in one terminal
 *   node scripts/capture-screenshots.mjs    # in another
 *
 * For every locale × theme it opens the real editor in headless Chrome, loads
 * the sample document and unfolds its stringified payload with a real click on
 * the Nested String Fold marker, then screenshots the window. Output lands in
 * `public/media/screenshot-<locale>-<theme>.webp`.
 *
 * Options: --url <origin>   dev server (default http://localhost:5173)
 *          --chrome <path>  Chrome binary
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { DEFAULT_CHROME, launchChrome, sleep } from './chrome.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public', 'media')

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const index = args.indexOf(name)
  return index === -1 ? fallback : args[index + 1]
}
const ORIGIN = option('--url', 'http://localhost:5173')
const CHROME = option('--chrome', DEFAULT_CHROME)

/** README images show ~880 px wide; 2× keeps the code sharp on retina screens. */
const VIEWPORT = { width: 1120, height: 700, scale: 2 }

async function capture(locale, theme) {
  const chrome = await launchChrome({ binary: CHROME, width: VIEWPORT.width, height: VIEWPORT.height })
  const { send, evaluate } = chrome
  try {
    await send('Page.enable')
    await send('Emulation.setDeviceMetricsOverride', {
      width: VIEWPORT.width,
      height: VIEWPORT.height,
      deviceScaleFactor: VIEWPORT.scale,
      mobile: false,
    })
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] })
    // Theme follows the emulated system setting; the locale is pinned.
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.clear(); localStorage.setItem('json-pilot.locale', ${JSON.stringify(locale)})`,
    })
    await send('Page.navigate', { url: `${ORIGIN}/app/` })

    const waitFor = async (expression, what) => {
      for (let attempt = 0; attempt < 150; attempt++) {
        const value = await evaluate(expression).catch(() => null)
        if (value) return value
        await sleep(100)
      }
      throw new Error(`timed out waiting for ${what}`)
    }
    await waitFor(`!!document.querySelector('.monaco-editor .view-lines')`, 'the editor')

    // Import the store by the exact URL the page loaded: after a hot update
    // Vite serves it as `editor-store.ts?t=…`, and the bare path would be a
    // second, disconnected copy.
    await evaluate(`(async () => {
      const loaded = (path) =>
        performance.getEntriesByType('resource').map((entry) => entry.name).find((name) => new URL(name).pathname === path) ?? path
      const [{ useEditorStore }, { SAMPLE_DOCUMENT }] = await Promise.all([
        import(loaded('/src/store/editor-store.ts')),
        import(loaded('/src/lib/json/sample.ts')),
      ])
      useEditorStore.getState().setValue(SAMPLE_DOCUMENT)
    })()`)

    // Unfold the stringified payload with a real click on its marker.
    const marker = await waitFor(
      `(() => {
        const rect = document.querySelector('.json-fold-expandable')?.getBoundingClientRect()
        return rect && rect.width > 0 ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null
      })()`,
      'the Nested String Fold marker',
    )
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', { type, x: marker.x, y: marker.y, button: 'left', clickCount: 1 })
    }
    // Park the pointer away from anything with a hover state, then let it settle.
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: VIEWPORT.width - 40, y: VIEWPORT.height - 120 })
    await sleep(700)

    const { data } = await send('Page.captureScreenshot', { format: 'webp', quality: 90 })
    const file = join(OUT_DIR, `screenshot-${locale}-${theme}.webp`)
    writeFileSync(file, Buffer.from(data, 'base64'))
    console.log(`  wrote ${file.slice(ROOT.length + 1)}`)
  } finally {
    await chrome.close()
  }
}

mkdirSync(OUT_DIR, { recursive: true })
for (const locale of ['en', 'zh-CN']) {
  for (const theme of ['light', 'dark']) await capture(locale, theme)
}
