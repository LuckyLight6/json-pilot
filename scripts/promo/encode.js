/**
 * WebCodecs encoders for scripts/render-promo.mjs, run inside headless Chrome.
 * Encoded chunks go back to the render script's server as one binary POST;
 * the metadata needed to mux them comes back as the evaluated result.
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function upload(name, parts) {
  const response = await fetch(`/upload/${name}`, { method: 'POST', body: new Blob(parts) })
  if (!response.ok) throw new Error(`upload ${name} failed: ${response.status}`)
}

const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes))

/**
 * H.264-encodes frames `from` (inclusive) to `to` (exclusive), fetched as
 * `/frames/<index>.jpg`. The run starts on a keyframe, so runs encoded in
 * separate browser sessions can be concatenated as long as their parameter
 * sets (`avcC`) match.
 */
export async function encodeVideo({ name, from, to, fps, width, height, quantizer, keyInterval }) {
  const config = {
    // High profile, level 5.1: level 4.x tops out below this frame size.
    codec: 'avc1.640033',
    width,
    height,
    // Constant quality rather than a bitrate target: quiet frames cost almost
    // nothing and busy ones get what they need. Measured against the captured
    // frames, it is both smaller and steadier than variable bitrate.
    bitrateMode: 'quantizer',
    framerate: fps,
    latencyMode: 'quality',
    avc: { format: 'avc' },
  }
  const { supported } = await VideoEncoder.isConfigSupported(config)
  if (!supported) throw new Error(`this browser cannot encode ${config.codec} at ${width}×${height}`)

  const chunks = []
  let avcC = null
  let failure = null
  const encoder = new VideoEncoder({
    output(chunk, meta) {
      if (meta?.decoderConfig?.description && !avcC) avcC = new Uint8Array(meta.decoderConfig.description)
      const data = new Uint8Array(chunk.byteLength)
      chunk.copyTo(data)
      chunks.push({ key: chunk.type === 'key', timestamp: chunk.timestamp, data })
    },
    error(error) {
      failure = error
    },
  })
  encoder.configure(config)

  const load = async (index) => createImageBitmap(await (await fetch(`/frames/${index}.jpg`)).blob())
  let next = load(from)
  for (let index = from; index < to; index++) {
    const bitmap = await next
    if (index + 1 < to) next = load(index + 1)
    if (bitmap.width !== width || bitmap.height !== height) {
      throw new Error(`frame ${index} is ${bitmap.width}×${bitmap.height}, expected ${width}×${height}`)
    }
    const frame = new VideoFrame(bitmap, { timestamp: Math.round((index * 1e6) / fps), duration: Math.round(1e6 / fps) })
    encoder.encode(frame, { keyFrame: (index - from) % keyInterval === 0, avc: { quantizer } })
    frame.close()
    bitmap.close()
    while (encoder.encodeQueueSize > 6) await sleep(2)
    if (failure) throw failure
  }
  await encoder.flush()
  encoder.close()
  if (failure) throw failure
  if (chunks.length !== to - from) throw new Error(`expected ${to - from} chunks, got ${chunks.length}`)
  for (let i = 1; i < chunks.length; i++) {
    if (chunks[i].timestamp <= chunks[i - 1].timestamp) throw new Error('the encoder reordered frames')
  }

  await upload(name, chunks.map((chunk) => chunk.data))
  return {
    avcC: toBase64(avcC),
    samples: chunks.map((chunk) => ({ key: chunk.key, size: chunk.data.length })),
  }
}

/** A block of per-channel samples as one planar f32 array, the layout AudioData wants. */
function planar(channels, start, frames) {
  const data = new Float32Array(frames * channels.length)
  for (const [c, channel] of channels.entries()) data.set(channel.subarray(start, start + frames), c * frames)
  return data
}

async function aacEncode(channels, sampleRate, bitrate) {
  const config = { codec: 'mp4a.40.2', sampleRate, numberOfChannels: channels.length, bitrate }
  const { supported } = await AudioEncoder.isConfigSupported(config)
  if (!supported) throw new Error('this browser cannot encode AAC')
  const chunks = []
  let asc = null
  let failure = null
  const encoder = new AudioEncoder({
    output(chunk, meta) {
      if (meta?.decoderConfig?.description && !asc) asc = new Uint8Array(meta.decoderConfig.description)
      const data = new Uint8Array(chunk.byteLength)
      chunk.copyTo(data)
      chunks.push(data)
    },
    error(error) {
      failure = error
    },
  })
  encoder.configure(config)
  const block = 4096
  const length = channels[0].length
  for (let start = 0; start < length; start += block) {
    const frames = Math.min(block, length - start)
    encoder.encode(
      new AudioData({
        format: 'f32-planar',
        sampleRate,
        numberOfFrames: frames,
        numberOfChannels: channels.length,
        timestamp: Math.round((start * 1e6) / sampleRate),
        data: planar(channels, start, frames),
      }),
    )
  }
  await encoder.flush()
  encoder.close()
  if (failure) throw failure
  return { chunks, asc }
}

async function aacDecode(chunks, asc, sampleRate, numberOfChannels) {
  const decoded = []
  let failure = null
  const decoder = new AudioDecoder({
    output(data) {
      const copy = new Float32Array(data.numberOfFrames)
      data.copyTo(copy, { planeIndex: 0, format: 'f32-planar' })
      decoded.push(copy)
      data.close()
    },
    error(error) {
      failure = error
    },
  })
  decoder.configure({ codec: 'mp4a.40.2', sampleRate, numberOfChannels, description: asc })
  for (const [i, data] of chunks.entries()) {
    decoder.decode(new EncodedAudioChunk({ type: 'key', timestamp: Math.round((i * 1024 * 1e6) / sampleRate), data }))
  }
  await decoder.flush()
  decoder.close()
  if (failure) throw failure
  const out = new Float32Array(decoded.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of decoded) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

/**
 * The encoder's delay ("priming"), measured rather than assumed: encode a
 * click, decode it, and see how late it comes back.
 */
async function measureDelay(sampleRate, bitrate) {
  const at = Math.round(sampleRate * 0.5)
  const probe = new Float32Array(sampleRate)
  for (let i = 0; i < 64; i++) probe[at + i] = Math.sin((i / 64) * Math.PI) * 0.8
  const { chunks, asc } = await aacEncode([probe, probe], sampleRate, bitrate)
  const decoded = await aacDecode(chunks, asc, sampleRate, 2)
  let peak = 0
  for (let i = 1; i < decoded.length; i++) if (Math.abs(decoded[i]) > Math.abs(decoded[peak])) peak = i
  return peak - (at + 32)
}

/**
 * AAC-encodes `buffer`, shifted earlier by the encoder's delay so the decoded
 * sound lands exactly on the picture's beats.
 */
export async function encodeAudio({ name, buffer, bitrate }) {
  const { sampleRate } = buffer
  const delay = Math.max(0, await measureDelay(sampleRate, bitrate))
  const channels = [0, 1].map((c) => {
    const source = buffer.getChannelData(Math.min(c, buffer.numberOfChannels - 1))
    const shifted = new Float32Array(source.length)
    shifted.set(source.subarray(delay))
    return shifted
  })
  const { chunks, asc } = await aacEncode(channels, sampleRate, bitrate)
  await upload(name, chunks)
  return { asc: toBase64(asc), sizes: chunks.map((chunk) => chunk.length), sampleRate, channels: 2, delay }
}

/** Writes frame `index` as a WebP poster. */
export async function poster({ name, index, quality = 0.85 }) {
  const bitmap = await createImageBitmap(await (await fetch(`/frames/${index}.jpg`)).blob())
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  canvas.getContext('2d').drawImage(bitmap, 0, 0)
  const blob = await canvas.convertToBlob({ type: 'image/webp', quality })
  await upload(name, [blob])
  return blob.size
}
