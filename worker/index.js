/**
 * The site is static assets (see wrangler.jsonc). This script sees only the
 * films (`run_worker_first`), because Cloudflare's asset server ignores Range
 * requests and always answers with the whole file. Chrome copes; Safari will
 * not play a video unless it gets byte ranges back, and every browser needs
 * them to start mid-film without downloading what comes before.
 */
export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request)
    const range = request.headers.get('Range')
    if (response.status !== 200 || !response.body) return response

    const headers = new Headers(response.headers)
    headers.set('Accept-Ranges', 'bytes')
    if (!range) return new Response(response.body, { status: 200, headers })

    // The asset server does not say how long the file is, so read it: the
    // films are a few megabytes, and the read comes from Cloudflare's own cache.
    const bytes = new Uint8Array(await response.arrayBuffer())
    const size = bytes.length
    const wanted = parseRange(range, size)
    if (wanted === null) {
      headers.set('Content-Length', String(size))
      return new Response(bytes, { status: 200, headers })
    }
    if (wanted === 'unsatisfiable') {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
    }
    const { start, end } = wanted
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`)
    headers.set('Content-Length', String(end - start + 1))
    return new Response(bytes.subarray(start, end + 1), { status: 206, headers })
  },
}

/** A single `bytes=` range within `size`, `null` for none (or several), or 'unsatisfiable'. */
function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match || (match[1] === '' && match[2] === '')) return null
  let start
  let end
  if (match[1] === '') {
    // bytes=-500: the last 500 bytes.
    start = Math.max(size - Number(match[2]), 0)
    end = size - 1
  } else {
    start = Number(match[1])
    end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1)
  }
  return start > end || start >= size ? 'unsatisfiable' : { start, end }
}
