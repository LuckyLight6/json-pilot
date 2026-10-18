#!/usr/bin/env node
/**
 * Renders the product-site intro film (scripts/promo/) to MP4.
 *
 *   node scripts/render-promo.mjs                          # every language and theme
 *   node scripts/render-promo.mjs --lang en --theme light  # one variant
 *
 * The film is a web page on a deterministic timeline, so rendering it is
 * mechanical: seek to every frame and screenshot it in headless Chrome, encode
 * the frames with WebCodecs (H.264), render and encode the soundtrack (AAC),
 * and mux the two into an MP4 here in Node. Nothing beyond Chrome is needed.
 *
 * Output in public/media/:
 *   promo-<lang>-<theme>.mp4      the film, 2240×1400 at 30 fps, with sound
 *   promo-<lang>-<theme>-sd.mp4   the same at 1280×800, for small screens and
 *                                 slow links (src/site/demo-video.tsx picks one)
 *   promo-<lang>-<theme>.webp     its poster frame
 *
 * Options: --lang en|zh-CN   render one language
 *          --theme dark|light render one theme
 *          --renditions hd,sd  render only these (the poster comes with hd)
 *          --music <file>    score the film with a licensed track instead of
 *                            the synthesised one (sound effects stay)
 *          --chrome <path>   Chrome binary
 *          --keep-frames     keep the captured frames
 *          --verbose
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { basename, dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { DEFAULT_CHROME, launchChrome, sleep } from './chrome.mjs'
import { writeMp4 } from './lib/mp4.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PROMO_DIR = join(ROOT, 'scripts', 'promo')
const OUT_DIR = join(ROOT, 'public', 'media')

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const index = args.indexOf(name)
  return index === -1 ? fallback : args[index + 1]
}
const LANGS = option('--lang', null) ? [option('--lang')] : ['en', 'zh-CN']
const THEMES = option('--theme', null) ? [option('--theme')] : ['dark', 'light']
const RENDITION_NAMES = option('--renditions', 'hd,sd').split(',')
const MUSIC = option('--music', null)
const CHROME = option('--chrome', DEFAULT_CHROME)
const KEEP_FRAMES = args.includes('--keep-frames')
const VERBOSE = args.includes('--verbose')

/** The stage is 1280×800 CSS px; the site shows it ~1,100 px wide, so 1.75× covers retina. */
const STAGE = { width: 1280, height: 800, scale: 1.75 }
const WIDTH = STAGE.width * STAGE.scale
const HEIGHT = STAGE.height * STAGE.scale
const FPS = 30
/**
 * Each film comes in two renditions, encoded at a constant H.264 quantizer
 * (lower is better, 0–51) picked by measurement against the captured frames:
 *
 * - hd: 26 averages 47.4 dB PSNR with its worst frame at 46.6 dB — visually
 *   lossless — at about 2.8 Mb/s, little more than half of what a 5 Mb/s
 *   variable-bitrate encode needed for a worse worst frame (44.7 dB).
 * - sd: a third of the pixels at 27, about 1 Mb/s, so it streams where HD
 *   would stall (GitHub Pages can manage as little as 1.5 Mb/s from mainland
 *   China) and still looks sharp on phones and standard-density screens.
 */
const RENDITIONS = [
  { name: 'hd', suffix: '', width: WIDTH, height: HEIGHT, quantizer: 26 },
  { name: 'sd', suffix: '-sd', width: 1280, height: 800, quantizer: 27 },
].filter((rendition) => RENDITION_NAMES.includes(rendition.name))
if (!RENDITIONS.length) throw new Error(`--renditions takes hd, sd or both, not ${RENDITION_NAMES.join(',')}`)
const AUDIO_BITRATE = 192_000
const SAMPLE_RATE = 48_000
/** A keyframe every 8 s keeps seeking quick without paying for many. */
const KEY_INTERVAL = FPS * 8
/** Frames per encoding session; a multiple of the keyframe interval. */
const SEGMENT = KEY_INTERVAL
/** Headless Chrome may exit about 30 s after launch (see chrome.mjs), so each session stops short of that. */
const SESSION_BUDGET_MS = 21_000
/** Chrome sessions capturing at once; frames are independent, so any order works. */
const WORKERS = 3
const POSTER_TIME = 3

const began = Date.now()
const log = (message) => console.log(`${((Date.now() - began) / 1000).toFixed(1).padStart(6)}s  ${message}`)
const trace = (message) => VERBOSE && log(message)

// --- Local server: the film, captured frames, uploads from the page ------------------------

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4',
}
const state = { framesDir: null }
const uploads = new Map()

const server = createServer((request, response) => {
  const { pathname } = new URL(request.url, 'http://localhost')
  if (request.method === 'POST' && pathname.startsWith('/upload/')) {
    const parts = []
    request.on('data', (part) => parts.push(part))
    request.on('end', () => {
      uploads.set(decodeURIComponent(pathname.slice('/upload/'.length)), Buffer.concat(parts))
      response.end('ok')
    })
    return
  }
  if (pathname === '/blank.html') {
    response.writeHead(200, { 'content-type': TYPES['.html'] })
    response.end('<!doctype html><meta charset="utf-8"><title>render</title>')
    return
  }
  let file
  if (pathname.startsWith('/frames/')) file = join(state.framesDir, basename(pathname))
  else if (pathname.startsWith('/media/')) file = join(OUT_DIR, basename(pathname))
  else if (pathname === '/music' && MUSIC) file = MUSIC
  else file = join(PROMO_DIR, basename(pathname))
  try {
    const body = readFileSync(file)
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
    response.end(body)
  } catch {
    response.writeHead(404).end()
  }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const ORIGIN = `http://127.0.0.1:${server.address().port}`

// --- Browser sessions ----------------------------------------------------------------------

async function waitFor(chrome, expression, timeout = 10_000) {
  const deadline = Date.now() + timeout
  for (;;) {
    try {
      if (await chrome.evaluate(expression)) return
    } catch {
      // The page is still navigating.
    }
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${expression}`)
    await sleep(50)
  }
}

/** One short-lived Chrome on `path`; `work` gets the session and its launch time. */
async function session(path, work) {
  const launchedAt = Date.now()
  const chrome = await launchChrome({ binary: CHROME, width: STAGE.width, height: STAGE.height, verbose: VERBOSE })
  try {
    await chrome.send('Emulation.setDeviceMetricsOverride', {
      width: STAGE.width,
      height: STAGE.height,
      deviceScaleFactor: STAGE.scale,
      mobile: false,
    })
    await chrome.send('Page.navigate', { url: `${ORIGIN}${path}` })
    await waitFor(chrome, 'document.readyState === "complete"')
    return await work(chrome, launchedAt)
  } finally {
    await chrome.close()
  }
}

const call = (fn, input) =>
  `import('/encode.js').then((module) => module.${fn}(${JSON.stringify(input)}))`

// --- Steps ---------------------------------------------------------------------------------

async function filmLength() {
  return session('/promo.html', async (chrome) => {
    await waitFor(chrome, 'window.ready !== undefined')
    return chrome.evaluate('window.ready.then(() => window.DURATION)')
  })
}

/** Runs `work` again if its Chrome session dies under it (they sometimes do, under load). */
async function retrying(label, work, attempts = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await work()
    } catch (error) {
      if (attempt >= attempts) throw error
      log(`  ${label}: ${error.message}; retrying`)
    }
  }
}

async function captureFrames({ name, query }, frames) {
  const todo = Array.from({ length: frames }, (_, index) => index)
  let done = 0
  let failures = 0
  const worker = async () => {
    while (todo.length) {
      let index
      try {
        await session(`/promo.html?${query}`, async (chrome, launchedAt) => {
          await waitFor(chrome, 'window.ready !== undefined')
          await chrome.evaluate('window.ready.then(() => true)')
          while (todo.length && Date.now() - launchedAt < SESSION_BUDGET_MS) {
            index = todo.shift()
            // Reading layout applies the seek, so the screenshot shows this frame.
            await chrome.evaluate(`seek(${index / FPS}); document.body.getBoundingClientRect(); true`)
            const { data } = await chrome.send('Page.captureScreenshot', { format: 'jpeg', quality: 95, optimizeForSpeed: true })
            writeFileSync(join(state.framesDir, `${index}.jpg`), Buffer.from(data, 'base64'))
            index = undefined
            done++
          }
        })
      } catch (error) {
        // Put the frame in flight back and carry on in a fresh session.
        if (index !== undefined) todo.unshift(index)
        if (++failures > 6) throw error
        log(`  ${name}: ${error.message}; continuing in a new session`)
      }
      log(`  ${name}: ${done} of ${frames} frames captured`)
    }
  }
  await Promise.all(Array.from({ length: WORKERS }, worker))
}

async function encodeFrames(variant, rendition, frames) {
  const samples = []
  let avcC = null
  for (let from = 0; from < frames; from += SEGMENT) {
    const to = Math.min(frames, from + SEGMENT)
    const name = `video-${variant}-${rendition.name}-${from}`
    const result = await retrying(name, () =>
      session('/blank.html', (chrome) =>
        chrome.evaluate(
        call('encodeVideo', {
          name,
          from,
          to,
          fps: FPS,
          width: rendition.width,
          height: rendition.height,
          quantizer: rendition.quantizer,
          keyInterval: KEY_INTERVAL,
        }),
        ),
      ),
    )
    // Runs from separate sessions only join up if their parameter sets agree.
    if (avcC && avcC !== result.avcC) throw new Error('encoder parameter sets differ between sessions')
    avcC = result.avcC
    const data = uploads.get(name)
    uploads.delete(name)
    let offset = 0
    for (const { key, size } of result.samples) {
      samples.push({ key, data: data.subarray(offset, offset + size) })
      offset += size
    }
    if (offset !== data.length) throw new Error(`${name}: ${data.length - offset} stray bytes`)
    trace(`  ${variant}: encoded frames ${from}–${to - 1}`)
  }
  return { avcC: Buffer.from(avcC, 'base64'), samples }
}

async function renderSoundtrack() {
  return session('/promo.html', async (chrome) => {
    await waitFor(chrome, 'window.ready !== undefined')
    const result = await chrome.evaluate(`(async () => {
      await window.ready
      const { encodeAudio } = await import('/encode.js')
      const bed = ${MUSIC ? "await new OfflineAudioContext(2, 1, 48000).decodeAudioData(await (await fetch('/music')).arrayBuffer())" : 'null'}
      const buffer = await renderMusic({ duration: DURATION, bpm: BPM, cues: CUES, sampleRate: ${SAMPLE_RATE}, bed })
      return encodeAudio({ name: 'audio', buffer, bitrate: ${AUDIO_BITRATE} })
    })()`)
    const data = uploads.get('audio')
    const samples = []
    let offset = 0
    for (const size of result.sizes) {
      samples.push({ data: data.subarray(offset, offset + size) })
      offset += size
    }
    trace(`  soundtrack: ${samples.length} AAC frames, encoder delay ${result.delay} samples compensated`)
    return { sampleRate: result.sampleRate, channels: result.channels, bitrate: AUDIO_BITRATE, asc: Buffer.from(result.asc, 'base64'), samples }
  })
}

/** Plays the written file back in Chrome: right length, right size, a picture, a soundtrack. */
async function verify(file, duration) {
  return session('/blank.html', (chrome) =>
    chrome.evaluate(`(async () => {
      const url = '/media/${basename(file)}'
      const video = document.createElement('video')
      video.muted = true
      video.src = url
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve
        video.onerror = () => reject(new Error('video: ' + (video.error && video.error.message)))
      })
      video.currentTime = ${duration / 2}
      await new Promise((resolve) => (video.onseeked = resolve))
      const canvas = new OffscreenCanvas(64, 40)
      const context = canvas.getContext('2d')
      context.drawImage(video, 0, 0, 64, 40)
      const pixels = context.getImageData(0, 0, 64, 40).data
      let light = 0
      for (let i = 0; i < pixels.length; i += 4) light += pixels[i] + pixels[i + 1] + pixels[i + 2]
      const audio = await new OfflineAudioContext(2, 1, 48000).decodeAudioData(await (await fetch(url)).arrayBuffer())
      return { duration: video.duration, width: video.videoWidth, height: video.videoHeight, light: light / (64 * 40 * 3), audio: audio.duration }
    })()`),
  )
}

// --- Run --------------------------------------------------------------------------------------

mkdirSync(OUT_DIR, { recursive: true })
try {
  const duration = await filmLength()
  const frames = Math.round(duration * FPS)
  log(`film: ${duration} s, ${frames} frames, ${RENDITIONS.map((r) => `${r.name} ${r.width}×${r.height}`).join(' and ')}`)

  const audio = await retrying('soundtrack', renderSoundtrack)
  log(`soundtrack: ${MUSIC ? basename(MUSIC) : 'synthesised'}, ${audio.samples.length} AAC frames`)

  const variants = LANGS.flatMap((lang) =>
    THEMES.map((theme) => ({ name: `${lang}-${theme}`, query: `lang=${lang}&theme=${theme}` })),
  )
  for (const variant of variants) {
    state.framesDir = mkdtempSync(join(tmpdir(), `json-pilot-promo-${variant.name}-`))
    await captureFrames(variant, frames)

    if (RENDITIONS.some((rendition) => rendition.name === 'hd')) {
      const poster = `promo-${variant.name}.webp`
      await retrying(poster, () =>
        session('/blank.html', (chrome) => chrome.evaluate(call('poster', { name: poster, index: POSTER_TIME * FPS }))),
      )
      writeFileSync(join(OUT_DIR, poster), uploads.get(poster))
      uploads.delete(poster)
      log(`wrote ${poster}`)
    }

    for (const rendition of RENDITIONS) {
      const { width, height } = rendition
      const video = await encodeFrames(variant.name, rendition, frames)
      const file = join(OUT_DIR, `promo-${variant.name}${rendition.suffix}.mp4`)
      writeFileSync(file, writeMp4({ video: { width, height, fps: FPS, ...video }, audio }))
      const check = await retrying('playback check', () => verify(file, duration))
      const problems = [
        Math.abs(check.duration - duration) > 0.1 && `duration ${check.duration}`,
        (check.width !== width || check.height !== height) && `size ${check.width}×${check.height}`,
        check.light < 2 && 'a black frame mid-film',
        Math.abs(check.audio - duration) > 0.2 && `soundtrack length ${check.audio}`,
      ].filter(Boolean)
      if (problems.length) throw new Error(`${basename(file)} failed playback checks: ${problems.join(', ')}`)
      log(`wrote ${basename(file)} (${(statSync(file).size / 1e6).toFixed(1)} MB); plays back at ${check.duration.toFixed(2)} s`)
    }

    if (KEEP_FRAMES) log(`  frames kept in ${state.framesDir}`)
    else rmSync(state.framesDir, { recursive: true, force: true })
  }
} finally {
  server.close()
}
