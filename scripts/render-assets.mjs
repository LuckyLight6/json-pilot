#!/usr/bin/env node
/**
 * Renders every raster brand asset from its source, so none of them can drift:
 *
 *   src/assets/icon.svg  →  public/icons/icon-192.png, icon-512.png
 *                           public/icons/icon-maskable-512.png  (full bleed, safe zone)
 *                           public/icons/apple-touch-icon.png   (180, full bleed)
 *   + an editor shot     →  public/og-image.png                 (1200×630 share card)
 *
 *   node scripts/render-assets.mjs [--chrome <path>]
 *
 * Run it after changing the icon, or after `capture-screenshots.mjs` refreshes
 * the editor screenshot the share card is built around.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { DEFAULT_CHROME, launchChrome, sleep } from './chrome.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const chromeIndex = args.indexOf('--chrome')
const CHROME = chromeIndex === -1 ? DEFAULT_CHROME : args[chromeIndex + 1]

const icon = readFileSync(join(ROOT, 'src/assets/icon.svg'), 'utf8')

/** iOS and Android mask icons themselves, so these fill the square edge to edge. */
const fullBleed = icon.replace(/<rect width="64" height="64" rx="[\d.]+"/, '<rect width="64" height="64"').replace(/<rect x="0\.75"[^>]*\/>/, '')

/** Android's maskable safe zone is the central 80%: shrink the glyph to fit it. */
const maskable = fullBleed.replace(/(<!-- Glyph -->[\s\S]*)<\/svg>/, (_, glyph) =>
  `<g transform="translate(32 32) scale(0.8) translate(-32 -32)">${glyph}</g></svg>`,
)

const dataUrl = (type, content) => `data:${type};base64,${Buffer.from(content).toString('base64')}`

function iconPage(svg, size) {
  return `<!doctype html><style>html,body{margin:0;background:transparent}</style>
    <img src="${dataUrl('image/svg+xml', svg)}" width="${size}" height="${size}" style="display:block">`
}

function sharePage(posterUrl, iconSvg) {
  return `<!doctype html><meta charset="utf-8"><style>
    html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif;
      color: #fafafa; background: #0a0a0a; position: relative;
    }
    .glow { position: absolute; inset: 0;
      background: radial-gradient(700px 420px at 20% 0%, rgba(56, 139, 253, 0.16), transparent 70%); }
    .grid { position: absolute; inset: 0;
      background-image: linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
      background-size: 48px 48px;
      mask-image: radial-gradient(ellipse 80% 80% at 30% 30%, black 20%, transparent 75%); }
    .copy { position: absolute; left: 72px; top: 92px; width: 540px; }
    .copy img { width: 84px; height: 84px; display: block; filter: drop-shadow(0 12px 28px rgba(31, 111, 235, 0.45)); }
    h1 { margin: 34px 0 0; font-size: 70px; line-height: 1; letter-spacing: -0.035em; font-weight: 700; }
    p { margin: 20px 0 0; font-size: 28px; line-height: 1.3; color: #a3a3a3; letter-spacing: -0.01em; }
    .chips { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 38px; }
    .chip { padding: 8px 14px; border-radius: 999px; font-size: 18px; color: #c9d1d9;
      background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.14); }
    .shot { position: absolute; left: 640px; top: 112px; width: 720px; border-radius: 18px; overflow: hidden;
      border: 1px solid rgba(255,255,255,0.14); box-shadow: 0 40px 100px rgba(0,0,0,0.65), 0 0 0 8px rgba(255,255,255,0.03);
      transform: perspective(1600px) rotateY(-14deg) rotateX(4deg); transform-origin: left center; }
    .shot img { display: block; width: 100%; }
  </style>
  <div class="glow"></div><div class="grid"></div>
  <div class="copy">
    <img src="${dataUrl('image/svg+xml', iconSvg)}" alt="">
    <h1>JSON Pilot</h1>
    <p>The JSON workbench that runs in your browser.</p>
    <div class="chips"><span class="chip">Nested String Fold</span><span class="chip">JSONPath &amp; JS</span><span class="chip">Compare</span></div>
  </div>
  <div class="shot"><img src="${posterUrl}" alt=""></div>`
}

async function render(html, width, height, file) {
  const chrome = await launchChrome({ binary: CHROME, width, height })
  try {
    await chrome.send('Page.enable')
    await chrome.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
    await chrome.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
    await chrome.send('Page.navigate', { url: dataUrl('text/html', html) })
    await sleep(600)
    const { data } = await chrome.send('Page.captureScreenshot', { format: 'png' })
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, Buffer.from(data, 'base64'))
    console.log(`wrote ${file.replace(`${ROOT}/`, '')}`)
  } finally {
    await chrome.close()
  }
}

const icons = [
  ['public/icons/icon-192.png', icon, 192],
  ['public/icons/icon-512.png', icon, 512],
  ['public/icons/icon-maskable-512.png', maskable, 512],
  ['public/icons/apple-touch-icon.png', fullBleed, 180],
]
for (const [file, svg, size] of icons) await render(iconPage(svg, size), size, size, join(ROOT, file))

const poster = readFileSync(join(ROOT, 'public/media/screenshot-en-dark.webp'))
await render(sharePage(dataUrl('image/webp', poster), icon), 1200, 630, join(ROOT, 'public/og-image.png'))
process.exit(0)
