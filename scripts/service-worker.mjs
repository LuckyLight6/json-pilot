#!/usr/bin/env node
/**
 * Runs after `vite build` (see the `build` script): writes dist/sw.js from
 * scripts/service-worker.js, telling it which files make up the editor — the
 * app entry and everything it imports, statically or lazily — so the product
 * site can have them fetched ahead of a visit to /app/.
 */
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const MANIFEST = join(DIST, '.vite', 'manifest.json')

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
const editor = new Set()
/**
 * Everything the editor entry imports. Stylesheets of statically imported
 * chunks are inlined into the page (scripts/prerender.mjs), so only lazily
 * loaded ones (Monaco's) are listed.
 */
const visit = (key, lazily = false) => {
  const chunk = manifest[key]
  if (!chunk || editor.has(chunk.file)) return
  editor.add(chunk.file)
  for (const file of [...(lazily ? (chunk.css ?? []) : []), ...(chunk.assets ?? [])]) editor.add(file)
  for (const next of chunk.imports ?? []) visit(next, lazily)
  for (const next of chunk.dynamicImports ?? []) visit(next, true)
}
visit('app/index.html')
if (editor.size < 3) throw new Error('the build manifest does not describe the editor entry')
// Monaco's web workers are emitted beside the chunks rather than imported by them.
for (const file of readdirSync(join(DIST, 'assets'))) if (/\.worker-.*\.js$/.test(file)) editor.add(`assets/${file}`)

// The fallback favicon and the touch icon are only fetched by browsers that need them.
const build = { editor: [...editor].filter((file) => !/\.html$|\/(favicon|apple-touch-icon)-/.test(file)) }
const source = readFileSync(join(ROOT, 'scripts', 'service-worker.js'), 'utf8')
if (!source.includes('self.__BUILD__')) throw new Error('scripts/service-worker.js has no BUILD placeholder')
writeFileSync(join(DIST, 'sw.js'), source.replace('self.__BUILD__', JSON.stringify(build)))
// The manifest only exists to be read here; it does not ship.
rmSync(join(DIST, '.vite'), { recursive: true, force: true })

console.log(`wrote dist/sw.js (${build.editor.length} editor files to warm)`)
