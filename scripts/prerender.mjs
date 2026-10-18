#!/usr/bin/env node
/**
 * Runs after `vite build` (see the `build` script). On a slow connection every
 * request costs seconds, so the first screen should need nothing but the HTML:
 *
 * 1. The product site is rendered to HTML at build time, once in English and
 *    once in Chinese, into `dist/index.html`. CSS shows only the copy in the
 *    language the head script picked, and a one-line script right after drops
 *    the other, so the page paints from the HTML alone; `src/site/main.tsx`
 *    then takes over with the same markup.
 * 2. Both pages' stylesheets are inlined, so that paint waits on no other file.
 */
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { build } from 'vite'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const SSR_OUT = join(ROOT, 'node_modules', '.cache', 'prerender')
/**
 * Chinese first: slow links are mostly a mainland-China problem, so Chinese
 * visitors get their copy right after the CSS instead of after the English one.
 */
const LOCALES = ['zh-CN', 'en']

// --- 1. Render the site -------------------------------------------------------------

await build({
  configFile: join(ROOT, 'vite.config.ts'),
  logLevel: 'warn',
  // Bundle every dependency, so rendering does not depend on how each package
  // resolves under plain Node.
  ssr: { noExternal: true },
  build: {
    ssr: join(ROOT, 'src/site/prerender.tsx'),
    outDir: SSR_OUT,
    emptyOutDir: true,
    copyPublicDir: false,
  },
  // Asset imports (the icon) resolve to the files the client build wrote.
  experimental: { renderBuiltUrl: (filename) => `./${filename}` },
})
const { render } = await import(pathToFileURL(join(SSR_OUT, 'prerender.js')).href)
const copies = LOCALES.map((locale) => `<div data-locale="${locale}">${render(locale)}</div>`).join('')
rmSync(SSR_OUT, { recursive: true, force: true })

/** Shows the copy in the page's language until the site script replaces both. */
const LOCALE_CSS =
  '#root>[data-locale]{display:contents}' +
  'html:not([lang="zh-CN"]) #root>[data-locale="zh-CN"],html[lang="zh-CN"] #root>[data-locale="en"]{display:none}'
/** Drops the other copy, so its ids do not shadow the visible one's anchors. */
const KEEP_ONE =
  "<script>(function(){var l=document.documentElement.lang==='zh-CN'?'zh-CN':'en';" +
  "document.querySelectorAll('#root>[data-locale]').forEach(function(e){if(e.getAttribute('data-locale')!==l)e.remove()})})()</script>"

const read = (file) => readFileSync(join(DIST, file), 'utf8')

let site = read('index.html')
if (!site.includes('<div id="root"></div>')) throw new Error('dist/index.html has no empty #root to prerender into')
site = site
  .replace('<div id="root"></div>', `<div id="root" data-prerendered>${copies}</div>${KEEP_ONE}`)
  .replace('</head>', `<style>${LOCALE_CSS}</style></head>`)
writeFileSync(join(DIST, 'index.html'), site)

// --- 2. Inline the stylesheets ---------------------------------------------------------

for (const page of ['index.html', 'app/index.html']) {
  const html = read(page).replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_, href) => {
    const css = readFileSync(join(DIST, dirname(page), href), 'utf8')
    if (/url\((?!['"]?data:)/.test(css)) throw new Error(`${href} references files; inlining would break their paths`)
    // Vite's lazy loader adds a stylesheet a lazy chunk needs unless a <link>
    // to it is already there. A disabled one is never fetched but still counts,
    // so opening the editor does not download what is inlined here again.
    return `<style>${css}</style><link rel="stylesheet" href="${href}" disabled>`
  })
  writeFileSync(join(DIST, page), html)
}

const size = (file) => `${(readFileSync(join(DIST, file)).length / 1024).toFixed(0)} kB`
console.log(`prerendered dist/index.html (${size('index.html')}), inlined CSS into dist/app/index.html (${size('app/index.html')})`)
