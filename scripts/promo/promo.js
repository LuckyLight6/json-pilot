/**
 * The JSON Pilot intro film: six scenes on one Web Animations timeline, cut to
 * a 120 BPM grid. Every scene is two bars, every key press and click lands on
 * a beat, and the soundtrack (music.js) is built from the same cue list.
 *
 * Every animated property of every element is a single keyframed track built
 * by `keys()`, so nothing fights over a property and `seek(t)` reproduces any
 * frame exactly. `window.ready` resolves once fonts are loaded and the film is
 * built; `window.DURATION` is its length and `window.CUES` its sound cues.
 *
 * `?lang=zh-CN` switches the copy and `?theme=light` the palette (promo.css);
 * the timeline is the same in every variant, so one soundtrack fits them all.
 */

import { renderMusic } from './music.js'

const COPY = {
  en: {
    tagline: 'The JSON workbench that runs in your browser.',
    chapters: ['Format', 'Nested String Fold', 'Query', 'Compare'],
    format: [['Messy JSON in. '], ['Clean JSON out.', true]],
    fold: [['Unfold the JSON '], ['hiding in strings.', true]],
    query: [['Ask your data '], ['anything.', true]],
    compare: [['See exactly '], ['what changed.', true]],
    matches: 'matches',
    changes: 'changes',
    chips: ['Format', 'Query', 'Compare', 'Nested String Fold'],
    line: 'Free · Open source · 100% in your browser',
    play: 'Click to play with sound',
  },
  'zh-CN': {
    tagline: '在浏览器里运行的 JSON 工作台。',
    chapters: ['格式化', '嵌套字符串折叠', '查询', '对比'],
    format: [['杂乱进，'], ['整洁出。', true]],
    fold: [['展开'], ['藏在字符串里', true], ['的 JSON。']],
    query: [['向数据'], ['随心提问', true], ['。']],
    compare: [['改动之处，'], ['一目了然', true], ['。']],
    matches: '个匹配',
    changes: '处改动',
    chips: ['格式化', '查询', '对比', '嵌套字符串折叠'],
    line: '免费 · 开源 · 100% 在浏览器本地运行',
    play: '点击播放（含音乐）',
  },
}

const BPM = 120
const BEAT = 60 / BPM
const BAR = BEAT * 4
const DURATION = BAR * 12 // 24 s: intro, four features, outro — two bars each
/** Each scene starts leaving this long before the next one's downbeat. */
const EXIT = 0.45

const OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'
const IN = 'cubic-bezier(0.7, 0, 0.84, 0)'
const IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)'
const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)'

const params = new URLSearchParams(location.search)
const lang = params.get('lang') === 'zh-CN' ? 'zh-CN' : 'en'
const copy = COPY[lang]
document.documentElement.lang = lang
const theme = params.get('theme') === 'light' ? 'light' : 'dark'
document.documentElement.dataset.theme = theme
/** A colour from promo.css, so animated colours follow the theme too. */
const ink = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
const stage = document.getElementById('stage')

/** Sound cues, collected while the film is built: `{ t, type }`. */
const CUES = []
const cue = (t, type) => CUES.push({ t, type })

// --- Building blocks ---------------------------------------------------------------

function h(tag, className, ...children) {
  const node = document.createElement(tag)
  if (className) node.className = className
  for (const child of children.flat()) {
    if (child === null || child === undefined) continue
    node.append(child instanceof Node ? child : document.createTextNode(String(child)))
  }
  return node
}

function css(node, styles) {
  Object.assign(node.style, styles)
  return node
}

/**
 * One track: `frames` are `[seconds, value, easing?]`, the easing applying to
 * the segment that starts at that frame. Held at the first value before the
 * track starts and at the last value after it ends.
 */
function keys(node, property, frames) {
  const start = frames[0][0]
  const span = Math.max(frames.at(-1)[0] - start, 0.001)
  node.animate(
    frames.map(([t, value, easing]) => ({ offset: (t - start) / span, [property]: value, easing: easing ?? OUT })),
    { delay: start * 1000, duration: span * 1000, fill: 'both' },
  )
}

/** Fade, rise and sharpen in at `at`; optionally leave at `out`. */
function appear(node, { at, dur = 0.7, y = 26, blur = 10, scale, out, outDur = 0.4 }) {
  const opacity = [[at, 0], [at + dur, 1]]
  const filter = [[at, `blur(${blur}px)`], [at + dur, 'blur(0px)']]
  if (out !== undefined) {
    opacity.push([out, 1, IN], [out + outDur, 0])
    filter.push([out, 'blur(0px)', IN], [out + outDur, `blur(${blur}px)`])
  }
  keys(node, 'opacity', opacity)
  keys(node, 'translate', [[at, `0 ${y}px`], [at + dur, '0 0']])
  keys(node, 'filter', filter)
  if (scale !== undefined) keys(node, 'scale', [[at, String(scale), SPRING], [at + dur, '1']])
}

/** A card or panel arriving in 3D: tipped back, rising, sharpening. */
function land(node, at, { axis = '1 0 0', angle = 24, shift = '0 60px', dur = 0.9 } = {}) {
  keys(node, 'opacity', [[at, 0], [at + dur * 0.5, 1]])
  keys(node, 'translate', [[at, shift], [at + dur, '0 0']])
  keys(node, 'rotate', [[at, `${axis} ${angle}deg`], [at + dur, `${axis} 0deg`]])
  keys(node, 'filter', [[at, 'blur(12px)'], [at + dur * 0.6, 'blur(0px)']])
}

/** A soft highlight gliding across a surface once it has landed. */
function sheen(node, at) {
  const band = h('div', 'sheen')
  node.append(band)
  keys(band, 'translate', [[at, '-200px 0', IN_OUT], [at + 1.1, `${node.offsetWidth + 200}px 0`]])
}

/**
 * A scene: its children animate in on their own over a slowly pushing-in
 * camera; the scene leaves as one, zooming past the viewer.
 */
function scene(at, out = at + BAR * 2 - EXIT) {
  const camera = h('div', 'camera')
  const node = h('div', 'scene', camera)
  stage.append(node)
  keys(node, 'opacity', [[at - 0.01, 0], [at, 1], [out, 1, IN], [out + EXIT, 0]])
  keys(node, 'scale', [[out, '1', IN], [out + EXIT, '1.08']])
  keys(node, 'filter', [[out, 'blur(0px)', IN], [out + EXIT, 'blur(16px)']])
  keys(camera, 'scale', [[at, '0.985', 'linear'], [out + EXIT, '1.03']])
  return camera
}

function kicker(index, label, at) {
  const node = h('div', 'kicker', h('span', 'index', String(index).padStart(2, '0')), label)
  appear(node, { at, y: 14, blur: 6 })
  return node
}

/** A headline revealed word by word (character by character for CJK). */
function headline(segments, at) {
  const node = h('h1', 'headline')
  const step = lang === 'zh-CN' ? 0.03 : 0.06
  let index = 0
  for (const [text, accent] of segments) {
    const pieces = lang === 'zh-CN' ? [...text] : text.split(/(?<= )/)
    for (const piece of pieces) {
      const word = h('span', accent ? 'word accent' : 'word', piece)
      appear(word, { at: at + index++ * step, dur: 0.75, y: 34, blur: 14 })
      node.append(word)
    }
  }
  return node
}

const tok = (cls, text) => h('span', cls, text)
const P = (text) => tok('p', text)
const K = (text) => tok('k', `"${text}"`)
const S = (text) => tok('s', `"${text}"`)
const N = (text) => tok('n', text)
const L = (text) => tok('l', text)
const indent = (level) => '  '.repeat(level)

function row(line, content, { chip } = {}) {
  const slot = h('span', 'chip-slot')
  if (chip) slot.append(chip)
  return h('div', 'row', h('span', 'gutter', slot, h('span', 'line', line)), h('span', 'content', content))
}

/** A code card: window bar, then rows. Its height is card bar + padding + rows. */
const CARD_CHROME = 42 + 32 + 2
const ROW = 32

function card(name, width, ...rows) {
  const node = h(
    'div',
    'card',
    h('div', 'card-bar', h('span', 'lights', h('i'), h('i'), h('i')), name),
    h('div', 'code', rows),
  )
  node.style.width = `${width}px`
  return node
}

/** Work that needs final layout: run with the film seeked to a given moment. */
const measured = []

/** Deterministic pseudo-random numbers, so every render places particles alike. */
function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

// --- The logo ------------------------------------------------------------------------

let logoCount = 0

/** The app icon (src/assets/icon.svg), split into parts that can move. */
function logo(size) {
  const id = `logo${logoCount++}`
  const node = css(h('div', 'logo', h('div', 'halo')), { width: `${size}px`, height: `${size}px` })
  node.insertAdjacentHTML(
    'beforeend',
    `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${id}-sky" x1="8" y1="0" x2="56" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5AB8FF"/><stop offset="1" stop-color="#1F6FEB"/></linearGradient>
        <linearGradient id="${id}-rim" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity=".14"/></linearGradient>
        <filter id="${id}-lift" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.2" flood-color="#0B3D91" flood-opacity=".35"/></filter>
      </defs>
      <g class="tile"><rect width="64" height="64" rx="14" fill="url(#${id}-sky)"/><rect x=".75" y=".75" width="62.5" height="62.5" rx="13.25" fill="none" stroke="url(#${id}-rim)" stroke-width="1.5"/></g>
      <g fill="none" stroke="#fff" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round">
        <path class="brace left" d="M19 15Q14 15 14 20.5V26.5Q14 31 10 32Q14 33 14 37.5V43.5Q14 49 19 49"/>
        <path class="brace right" d="M45 15Q50 15 50 20.5V26.5Q50 31 54 32Q50 33 50 37.5V43.5Q50 49 45 49"/>
      </g>
      <g class="trail" stroke="#fff" stroke-linecap="round" stroke-width="1.4"><path d="M8 47L21 40" stroke-opacity=".7"/><path d="M12 53L23 47" stroke-opacity=".45"/></g>
      <g class="plane" filter="url(#${id}-lift)">
        <path d="M45.5 19.5L19 30.2L27.4 34.1Z" fill="#fff"/>
        <path d="M45.5 19.5L27.4 34.1L31 44.5Z" fill="#CFE3FF"/>
        <path d="M27.4 34.1L31 44.5L32.8 36.4Z" fill="#CFE3FF" opacity=".7"/>
      </g>
    </svg>`,
  )
  return node
}

/** The logo builds itself: the tile lands, the braces close in, the plane flies through. */
function assembleLogo(node, at) {
  const part = (selector) => node.querySelector(selector)
  const [tile, left, right, plane, trail, halo] = ['.tile', '.left', '.right', '.plane', '.trail', '.halo'].map(part)
  for (const svgPart of [tile, plane]) css(svgPart, { transformBox: 'fill-box', transformOrigin: 'center' })

  keys(tile, 'opacity', [[at, 0], [at + 0.3, 1]])
  keys(tile, 'scale', [[at, '0.6', SPRING], [at + 0.7, '1']])
  for (const [brace, from] of [[left, '-14px 0'], [right, '14px 0']]) {
    keys(brace, 'translate', [[at + 0.15, from, SPRING], [at + 0.75, '0 0']])
    keys(brace, 'opacity', [[at + 0.15, 0], [at + 0.4, 1]])
  }
  // The plane comes in low from the left and settles exactly on the beat.
  const landing = at + 1
  keys(plane, 'opacity', [[landing - 0.55, 0], [landing - 0.4, 1]])
  keys(plane, 'translate', [[landing - 0.55, '-34px 22px'], [landing, '0 0']])
  keys(plane, 'rotate', [[landing - 0.55, '-18deg'], [landing, '0deg']])
  keys(plane, 'scale', [[landing - 0.55, '0.5'], [landing - 0.05, '1.06'], [landing + 0.25, '1']])
  keys(trail, 'opacity', [[landing - 0.4, 0], [landing - 0.15, 1], [landing + 0.35, 0]])
  keys(trail, 'translate', [[landing - 0.4, '-10px 6px'], [landing + 0.35, '4px -2px']])
  keys(halo, 'opacity', [[landing - 0.2, 0], [landing + 0.2, 1, IN_OUT], [landing + 1.4, 0.55]])
  keys(halo, 'scale', [[landing - 0.2, '0.6'], [landing + 0.5, '1']])
  cue(landing - 0.55, 'whoosh')
  cue(landing, 'land')
}

function wordmark(at, size) {
  const node = h('div', 'wordmark', [...'JSON Pilot'].map((char) => h('span', null, char)))
  if (size) node.style.fontSize = `${size}px`
  for (const [i, letter] of [...node.children].entries()) {
    appear(letter, { at: at + i * 0.03, dur: 0.7, y: 40, blur: 14 })
  }
  return node
}

// --- Atmosphere ----------------------------------------------------------------------

function atmosphere() {
  const grid = h('div', 'grid')
  const blue = h('div', 'light blue')
  const sky = css(h('div', 'light sky'), { opacity: '0.5' })
  const pulse = h('div', 'pulse')
  stage.append(blue, sky, grid, pulse)
  // One grid cell over the whole film, and the lights back where they began,
  // so the film loops seamlessly.
  keys(grid, 'translate', [[0, '0 0', 'linear'], [DURATION, '0 48px']])
  keys(blue, 'translate', [[0, '-300px -460px', IN_OUT], [DURATION / 2, '560px -320px', IN_OUT], [DURATION, '-300px -460px']])
  keys(sky, 'translate', [[0, '700px 300px', IN_OUT], [DURATION / 2, '-120px 240px', IN_OUT], [DURATION, '700px 300px']])

  // The light breathes on every beat while the groove plays, hardest on the downbeat.
  const beats = [[0, 0]]
  for (let beat = 8; beat < 40; beat++) {
    const t = beat * BEAT
    beats.push([t, beat % 4 === 0 ? 1 : 0.55, 'cubic-bezier(0.2, 0.8, 0.3, 1)'], [t + BEAT * 0.9, 0.08])
  }
  beats.push([BAR * 10, 0])
  keys(pulse, 'opacity', beats)

  // Drifting dust, catching the light.
  const next = random(7)
  for (let i = 0; i < 46; i++) {
    const size = 1.2 + next() * 2.6
    const dot = css(h('div', 'particle'), {
      width: `${size}px`,
      height: `${size}px`,
      left: `${next() * 1280}px`,
      top: `${next() * 860}px`,
      opacity: String(0.08 + next() * 0.4),
    })
    stage.append(dot)
    keys(dot, 'translate', [[0, '0 0', 'linear'], [DURATION, `${(next() - 0.5) * 120}px -${120 + next() * 260}px`]])
  }
}

/** A soft flash on each cut, like the camera passing through light. */
function flash(at) {
  const node = h('div', 'flash')
  stage.append(node)
  keys(node, 'opacity', [[at - 0.12, 0], [at, 0.22], [at + 0.6, 0]])
  cue(at, 'impact')
}

function chapters() {
  const bar = h('div', 'chapters')
  for (const [i, label] of copy.chapters.entries()) {
    const fill = h('div', 'fill')
    const name = h('span', null, `${String(i + 1).padStart(2, '0')}  ${label}`)
    bar.append(h('div', 'chapter', h('div', 'track', fill), name))
    const start = BAR * (2 + i * 2)
    const end = start + BAR * 2
    keys(fill, 'scale', [[start, '0 1', 'linear'], [end, '1 1']])
    const [dim, lit] = [ink('--faint'), ink('--text')]
    keys(name, 'color', [[start - 0.2, dim], [start, lit], [end - 0.2, lit], [end, dim]])
  }
  stage.append(bar)
  keys(bar, 'opacity', [[BAR * 2 - 0.4, 0], [BAR * 2, 1], [BAR * 10 - 0.2, 1, IN], [BAR * 10 + 0.3, 0]])
  keys(bar, 'translate', [[BAR * 2 - 0.4, '0 16px'], [BAR * 2, '0 0']])
}

// --- 0 · Intro --------------------------------------------------------------------------

function intro() {
  const camera = scene(0)
  const mark = logo(140)
  assembleLogo(mark, 0.15)
  const tagline = h('div', 'tagline', copy.tagline)
  appear(tagline, { at: BAR, y: 14 })
  camera.append(mark, wordmark(1.15), tagline)
}

// --- 1 · Format ---------------------------------------------------------------------------

function format() {
  const at = BAR * 2
  const camera = scene(at)
  camera.append(kicker(1, copy.chapters[0], at + 0.05), headline(copy.format, at + 0.12))

  const oneLiner = h('span', 'scroll', [
    P('{'), K('service'), P(':'), S('checkout'), P(','), K('version'), P(':'), N('3'), P(','), K('enabled'), P(':'),
    L('true'), P(','), K('endpoints'), P(':['), S('/cart'), P(','), S('/orders'), P('],'), K('limits'), P(':{'),
    K('rpm'), P(':'), N('600'), P(','), K('burst'), P(':'), N('50'), P('},'), K('lastEvent'), P(':{'), K('id'), P(':'),
    S('evt_8f21'), P('}}'),
  ])
  const minified = row('1', oneLiner)
  const pretty = [
    [P('{')],
    [indent(1), K('service'), P(': '), S('checkout'), P(',')],
    [indent(1), K('version'), P(': '), N('3'), P(',')],
    [indent(1), K('enabled'), P(': '), L('true'), P(',')],
    [indent(1), K('endpoints'), P(': ['), S('/cart'), P(', '), S('/orders'), P('],')],
    [indent(1), K('limits'), P(': { '), K('rpm'), P(': '), N('600'), P(', '), K('burst'), P(': '), N('50'), P(' },')],
    [indent(1), K('lastEvent'), P(': {')],
    [indent(2), K('id'), P(': '), S('evt_8f21')],
    [indent(1), P('}')],
    [P('}')],
  ].map((content, i) => row(String(i + 1), content))
  const prettyBlock = css(h('div', null, pretty), { position: 'absolute', inset: '16px 0 auto 0' })

  const node = card('response.json', 800, minified, prettyBlock)
  node.querySelector('.code').style.position = 'relative'
  // Reserve the formatted height up front, so the headline never moves.
  const formatted = CARD_CHROME + ROW * pretty.length
  const holder = css(h('div', null, node), { position: 'relative', height: `${formatted + 40}px` })
  camera.append(holder)
  land(node, at + 0.4)
  sheen(node, at + 1.2)

  // The one-liner runs on past the edge, as if it never ends…
  keys(oneLiner, 'translate', [[at + 0.8, '0 0', IN_OUT], [at + 1.95, '-340px 0']])
  const press = at + BAR // the downbeat of the scene's second bar
  keys(minified, 'opacity', [[press, 1, IN], [press + 0.2, 0]])
  keys(minified, 'filter', [[press, 'blur(0px)', IN], [press + 0.2, 'blur(8px)']])

  // …until ⌥⇧F lands on the beat…
  const keycaps = css(h('div', 'keys', ['⌥', '⇧', 'F'].map((key) => h('span', 'keycap', key))), {
    position: 'absolute',
    left: '50%',
    top: '186px',
    zIndex: '3',
  })
  holder.append(keycaps)
  keys(keycaps, 'opacity', [[press - 0.6, 0], [press - 0.35, 1], [press + 0.45, 1, IN], [press + 0.7, 0]])
  keys(keycaps, 'translate', [[press - 0.6, '-50% 24px'], [press - 0.3, '-50% 0'], [press + 0.45, '-50% 0', IN], [press + 0.7, '-50% 20px']])
  keys(keycaps, 'scale', [[press - 0.6, '0.6', SPRING], [press - 0.25, '1', IN_OUT], [press - 0.08, '1', IN_OUT], [press, '0.88'], [press + 0.2, '1']])
  cue(press, 'key')

  // …and the line falls into shape.
  keys(node, 'height', [[press, `${CARD_CHROME + ROW}px`], [press + 0.6, `${formatted}px`]])
  for (const [i, line] of pretty.entries()) {
    const start = press + 0.04 + i * 0.045
    keys(line, 'opacity', [[start, 0], [start + 0.4, 1]])
    keys(line, 'translate', [[start, '-18px 0'], [start + 0.55, '0 0']])
    keys(line, 'filter', [[start, 'blur(6px)'], [start + 0.35, 'blur(0px)']])
  }
  cue(press + 0.04, 'cascade')
}

// --- 2 · Nested String Fold ---------------------------------------------------------------

function fold() {
  const at = BAR * 4
  const camera = scene(at)
  camera.append(kicker(2, copy.chapters[1], at + 0.05), headline(copy.fold, at + 0.12))

  const plus = h('span', 'fold-chip plus')
  const minus = css(h('span', 'fold-chip minus'), { position: 'absolute', inset: '0' })
  const rings = [h('span', 'ring'), h('span', 'ring')]
  const chip = css(h('span', null, plus, minus, rings), { position: 'relative', display: 'inline-flex' })

  const stringValue = tok('s', '"{\\"orderId\\":\\"A-1093\\",\\"total\\":42.5}"')
  const brace = css(P('{'), { position: 'absolute', left: '0' })
  const valueSlot = css(h('span', null, stringValue, brace), { position: 'relative' })

  const nested = [
    row('5', [indent(2), K('orderId'), P(': '), S('A-1093'), P(',')]),
    row('6', [indent(2), K('total'), P(': '), N('42.5')]),
    row('7', [indent(1), P('}')]),
  ]
  const nestedBlock = css(h('div', null, nested), { overflow: 'hidden' })
  const closing = row('5', [P('}')])
  const oldNumber = closing.querySelector('.line')
  const newNumber = css(h('span', null, '8'), { position: 'absolute', right: '18px' })
  css(oldNumber.parentElement, { position: 'relative' }).append(newNumber)

  const node = card(
    'webhook-event.json',
    840,
    row('1', [P('{')]),
    row('2', [indent(1), K('id'), P(': '), S('evt_8f21'), P(',')]),
    row('3', [indent(1), K('type'), P(': '), S('order.created'), P(',')]),
    row('4', [indent(1), K('payload'), P(': '), valueSlot], { chip }),
    nestedBlock,
    closing,
  )
  const holder = css(h('div', null, node), { height: `${CARD_CHROME + ROW * 8 + 40}px` })
  camera.append(holder)
  land(node, at + 0.4)
  sheen(node, at + 1.2)

  // The marker calls for attention…
  const press = at + BAR + BEAT // beat two of the second bar
  for (const [i, ring] of rings.entries()) {
    const start = at + 1.2 + i * 0.5
    keys(ring, 'opacity', [[start - 0.01, 0], [start, 0.9], [start + 0.9, 0]])
    keys(ring, 'scale', [[start, '1'], [start + 0.9, '2.6']])
  }

  // …a pointer clicks it…
  const pointer = h('div', 'pointer')
  pointer.innerHTML =
    '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M5 2.5v17.2l4.4-4.2 2.9 6.6 2.7-1.2-2.9-6.5h6.2z" fill="#0d1117" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>'
  const click = h('div', 'click')
  stage.append(click, pointer)
  measured.push([
    press,
    () => {
      const target = chip.getBoundingClientRect()
      const x = target.left + target.width / 2
      const y = target.top + target.height / 2
      keys(pointer, 'opacity', [[at + 1.3, 0], [at + 1.55, 1], [press + 0.8, 1], [press + 1.1, 0]])
      keys(pointer, 'translate', [[at + 1.3, `${x + 280}px ${y + 210}px`, IN_OUT], [press - 0.04, `${x - 5}px ${y - 3}px`]])
      keys(pointer, 'scale', [[press - 0.04, '1'], [press + 0.04, '0.8'], [press + 0.2, '1']])
      css(click, { left: `${x}px`, top: `${y}px` })
      keys(click, 'opacity', [[press - 0.01, 0], [press, 0.95], [press + 0.5, 0]])
      keys(click, 'scale', [[press, '0.4'], [press + 0.5, '1.7']])
    },
  ])
  cue(press, 'click')

  // …and the string unpacks into structure.
  keys(plus, 'opacity', [[press, 1], [press + 0.15, 0]])
  keys(minus, 'opacity', [[press, 0], [press + 0.15, 1]])
  keys(stringValue, 'opacity', [[press, 1, IN], [press + 0.22, 0]])
  keys(stringValue, 'filter', [[press, 'blur(0px)', IN], [press + 0.22, 'blur(6px)']])
  keys(stringValue, 'letterSpacing', [[press, '0px', IN], [press + 0.22, '4px']])
  keys(brace, 'opacity', [[press + 0.12, 0], [press + 0.35, 1]])
  keys(nestedBlock, 'height', [[press + 0.08, '0px', SPRING], [press + 0.7, `${ROW * nested.length}px`]])
  const settle = press + 1.3
  const brand = ink('--brand-rgb')
  for (const [i, line] of nested.entries()) {
    const start = press + 0.15 + i * 0.07
    keys(line, 'opacity', [[start, 0], [start + 0.35, 1]])
    keys(line, 'translate', [[start, '-14px 0'], [start + 0.5, '0 0']])
    keys(line, 'boxShadow', [
      [start, `inset 3px 0 0 rgba(${brand}, 0)`],
      [start + 0.3, `inset 3px 0 0 rgba(${brand}, 0.95)`],
      [settle, `inset 3px 0 0 rgba(${brand}, 0.95)`, IN_OUT],
      [settle + 0.3, `inset 3px 0 0 rgba(${brand}, 0)`],
    ])
    keys(line, 'backgroundColor', [
      [start, `rgba(${brand}, 0)`],
      [start + 0.3, `rgba(${brand}, 0.1)`],
      [settle, `rgba(${brand}, 0.1)`, IN_OUT],
      [settle + 0.3, `rgba(${brand}, 0)`],
    ])
  }
  keys(oldNumber, 'opacity', [[press + 0.2, 1], [press + 0.35, 0]])
  keys(newNumber, 'opacity', [[press + 0.2, 0], [press + 0.35, 1]])
  cue(press + 0.1, 'sparkle')
}

// --- 3 · Query ------------------------------------------------------------------------------

/** Types `text` into `node` from `start`, one character per `perChar` seconds. */
function typing(node, caret, text, start, perChar) {
  node.textContent = text
  const end = start + text.length * perChar
  const steps = `steps(${text.length}, end)`
  keys(node, 'width', [[start, '0ch', steps], [end, `${text.length}ch`]])
  keys(caret, 'translate', [[start, '0ch 0', steps], [end, `${text.length}ch 0`]])
  for (let i = 0; i < text.length; i += 2) cue(start + i * perChar, 'type')
  return end
}

function query() {
  const at = BAR * 6
  const camera = scene(at)
  camera.append(kicker(3, copy.chapters[2], at + 0.05), headline(copy.query, at + 0.12))

  const jsonpath = h('span', null, 'JSONPath')
  const javascript = h('span', null, 'JavaScript')
  const pill = css(h('span', 'pill'), { left: '4px' })
  const modes = h('div', 'modes', pill, jsonpath, javascript)
  const pathText = h('span', 'text')
  const scriptText = h('span', 'text')
  const pathCaret = css(h('span', 'caret'), { left: '0' })
  const scriptCaret = css(h('span', 'caret'), { left: '0' })
  const typed = h('div', 'typed', pathText, scriptText, pathCaret, scriptCaret)
  const enter = css(h('span', 'keycap', '↵'), { minWidth: '46px', height: '46px', fontSize: '20px', borderRadius: '11px' })
  const bar = h('div', 'command', modes, typed, enter)
  const results = h('div', 'results')
  camera.append(bar, results)
  land(bar, at + 0.35, { angle: 30 })
  sheen(bar, at + 1)

  // Beats of the scene: run the JSONPath, flip to JavaScript, reveal its answer.
  const enterAt = at + BEAT * 3
  const switchAt = at + BEAT * 4.5
  const answerAt = at + BEAT * 6

  const pathEnd = typing(pathText, pathCaret, '$.users[?(@.active)].name', at + 0.7, 0.03)
  console.assert(pathEnd < enterAt, 'JSONPath typing overruns Enter')
  keys(enter, 'scale', [[enterAt - 0.08, '1', IN_OUT], [enterAt, '0.84'], [enterAt + 0.2, '1']])
  const [rim, text] = [ink('--keycap-border'), ink('--text')]
  keys(enter, 'borderColor', [[enterAt - 0.05, rim], [enterAt, ink('--brand')], [enterAt + 0.5, rim]])
  keys(enter, 'color', [[enterAt - 0.05, text], [enterAt, ink('--tok-key')], [enterAt + 0.5, text]])
  cue(enterAt, 'enter')

  // Two matches spring up, with a count above them.
  const badge = css(h('div', null, h('span', 'badge', h('b', null, '2'), copy.matches)), {
    position: 'absolute',
    left: '0',
    right: '0',
    textAlign: 'center',
  })
  results.append(badge)
  appear(badge, { at: enterAt + 0.05, dur: 0.45, y: 16, out: switchAt - 0.05, outDur: 0.25 })
  for (const [i, name] of ['ada', 'cy'].entries()) {
    const match = css(h('span', 'result-pill', `"${name}"`), { left: `${270 + i * 190}px`, top: '70px' })
    results.append(match)
    const start = enterAt + 0.08 + (i * BEAT) / 4
    keys(match, 'opacity', [[start, 0], [start + 0.2, 1], [switchAt - 0.05, 1, IN], [switchAt + 0.2, 0]])
    keys(match, 'translate', [[start, '0 80px', SPRING], [start + 0.6, '0 0']])
    keys(match, 'scale', [[start, '0.6', SPRING], [start + 0.6, '1']])
    keys(match, 'filter', [[switchAt - 0.05, 'blur(0px)', IN], [switchAt + 0.2, 'blur(8px)']])
    cue(start, 'pop')
  }

  // Flip to JavaScript and ask a different question.
  keys(pill, 'translate', [[switchAt, '0 0', IN_OUT], [switchAt + 0.3, `${javascript.offsetLeft - jsonpath.offsetLeft}px 0`]])
  keys(pill, 'width', [[switchAt, `${jsonpath.offsetWidth}px`, IN_OUT], [switchAt + 0.3, `${javascript.offsetWidth}px`]])
  keys(jsonpath, 'color', [[switchAt, ink('--text')], [switchAt + 0.3, ink('--muted')]])
  keys(javascript, 'color', [[switchAt, ink('--muted')], [switchAt + 0.3, ink('--text')]])
  keys(pathText, 'opacity', [[switchAt, 1, IN], [switchAt + 0.2, 0]])
  keys(pathCaret, 'opacity', [[switchAt, 1, 'steps(1, end)'], [switchAt + 0.01, 0]])
  cue(switchAt, 'switch')

  const scriptAt = switchAt + 0.25
  keys(scriptCaret, 'opacity', [[scriptAt - 0.01, 0, 'steps(1, end)'], [scriptAt, 1]])
  const scriptEnd = typing(scriptText, scriptCaret, 'd => d.users.length', scriptAt, 0.025)
  console.assert(scriptEnd < answerAt, 'JavaScript typing overruns the answer')

  const answer = h('div', 'big-number', '3')
  results.append(answer)
  keys(answer, 'opacity', [[answerAt, 0], [answerAt + 0.2, 1]])
  keys(answer, 'scale', [[answerAt, '0.4', SPRING], [answerAt + 0.6, '1']])
  keys(answer, 'filter', [[answerAt, 'blur(18px)'], [answerAt + 0.4, 'blur(0px)']])
  cue(answerAt, 'reveal')
}

// --- 4 · Compare -----------------------------------------------------------------------------

function diffRow(line, content, kind) {
  const node = row(line, content)
  node.classList.add('diff-row')
  if (kind) {
    node.classList.add(kind)
    node.prepend(h('span', 'wash'))
  }
  return node
}

function compare() {
  const at = BAR * 8
  const camera = scene(at)
  camera.append(kicker(4, copy.chapters[3], at + 0.05), headline(copy.compare, at + 0.12))

  const left = card(
    'v1.json',
    480,
    diffRow('1', [P('{')]),
    diffRow('2', [indent(1), K('plan'), P(': '), S('free'), P(',')], 'removed'),
    diffRow('3', [indent(1), K('seats'), P(': '), N('3'), P(',')]),
    diffRow('4', [indent(1), K('trial'), P(': '), L('true'), P(',')], 'removed'),
    diffRow('5', [indent(1), K('region'), P(': '), S('eu')]),
    diffRow('6', [P('}')]),
  )
  const right = card(
    'v2.json',
    480,
    diffRow('1', [P('{')]),
    diffRow('2', [indent(1), K('plan'), P(': '), S('pro'), P(',')], 'added'),
    diffRow('3', [indent(1), K('seats'), P(': '), N('3'), P(',')]),
    diffRow('4', [indent(1), K('trial'), P(': '), L('false'), P(',')], 'added'),
    diffRow('5', [indent(1), K('sso'), P(': '), L('true'), P(',')], 'added'),
    diffRow('6', [indent(1), K('region'), P(': '), S('eu')]),
    diffRow('7', [P('}')]),
  )
  camera.append(h('div', 'compare', left, right))
  land(left, at + 0.4, { axis: '0 1 0', angle: 32, shift: '-180px 30px', dur: 1 })
  land(right, at + 0.4, { axis: '0 1 0', angle: -32, shift: '180px 30px', dur: 1 })
  cue(at + 0.4, 'swish')
  sheen(left, at + 1.3)
  sheen(right, at + 1.45)

  // Changes light up line by line, on the eighth notes of the second bar.
  const [plan, trial] = left.querySelectorAll('.wash')
  const [planAdded, trialAdded, sso] = right.querySelectorAll('.wash')
  for (const [i, wash] of [plan, planAdded, trial, trialAdded, sso].entries()) {
    const start = at + BAR + (i * BEAT) / 2
    keys(wash, 'scale', [[start, '0 1', IN_OUT], [start + 0.4, '1 1']])
    cue(start, 'tick')
  }

  const badge = css(h('div', null, h('span', 'badge', h('b', null, '3'), copy.changes)), { marginTop: '26px' })
  camera.append(badge)
  appear(badge, { at: at + BAR + BEAT * 3, y: 14, scale: 0.8 })
}

// --- 5 · Outro ---------------------------------------------------------------------------------

function outro() {
  const at = BAR * 10
  const camera = scene(at, DURATION + 1)
  const mark = logo(112)
  assembleLogo(mark, at - 0.2)
  const name = css(wordmark(at + 0.75, 78), { marginTop: '26px' })
  const chips = h('div', 'chips', copy.chips.map((chip) => h('span', null, chip)))
  for (const [i, chip] of [...chips.children].entries()) {
    appear(chip, { at: at + BAR / 2 + (i * BEAT) / 4, y: 18, scale: 0.9 })
  }
  const line = h('div', 'tagline', copy.line)
  appear(line, { at: at + BAR * 0.75, y: 12 })
  const url = h('div', 'url', 'luckylight6.github.io/json-pilot')
  appear(url, { at: at + BAR, y: 10 })
  camera.append(mark, name, chips, line, url)
  cue(at, 'finale')
}

// --- Assemble -----------------------------------------------------------------------------------

function build() {
  atmosphere()
  intro()
  format()
  fold()
  query()
  compare()
  outro()
  chapters()
  for (let cut = BAR * 2; cut <= BAR * 10; cut += BAR * 2) flash(cut)
  const curtain = h('div', 'curtain')
  stage.append(h('div', 'vignette'), curtain)
  // Fades in from and out to the background, so the film loops cleanly.
  keys(curtain, 'opacity', [[0, 1], [0.4, 0], [DURATION - 0.6, 0, IN], [DURATION, 1]])

  for (const [moment, run] of measured) {
    seek(moment)
    run()
  }
  CUES.sort((a, b) => a.t - b.t)
}

function seek(seconds) {
  for (const animation of document.getAnimations()) {
    animation.pause()
    animation.currentTime = seconds * 1000
  }
}

/** Preview: render the soundtrack, then play picture and sound together. */
async function playWithSound() {
  const button = h('button', 'play-preview', copy.play)
  stage.append(button)
  await new Promise((resolve) => button.addEventListener('click', resolve, { once: true }))
  button.remove()
  const context = new AudioContext()
  const buffer = await renderMusic({ duration: DURATION, bpm: BPM, cues: CUES, sampleRate: context.sampleRate })
  const source = new AudioBufferSourceNode(context, { buffer })
  source.connect(context.destination)
  const start = context.currentTime + 0.1
  source.start(start)
  const tick = () => {
    const t = context.currentTime - start
    seek(Math.max(0, Math.min(t, DURATION)))
    if (t < DURATION) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

Object.assign(window, { DURATION, BPM, CUES, seek, renderMusic })
window.ready = document.fonts.ready.then(() => {
  build()
  seek(Number(params.get('t') ?? 0))
  if (params.has('play')) void playWithSound()
})
