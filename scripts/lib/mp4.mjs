/**
 * A minimal MP4 writer for one H.264 video track and one AAC audio track:
 * just enough ISO BMFF for every browser to play it. The `moov` box goes
 * before the media data ("fast start"), so playback can begin while the file
 * is still downloading.
 *
 * Samples are interleaved by time, one sample per chunk. The encoders emit no
 * reordered frames, so decode order is presentation order and no composition
 * offsets (`ctts`) are needed — `writeMp4` checks rather than assumes that.
 */

function box(type, ...payload) {
  const body = Buffer.concat(payload.flat())
  const head = Buffer.alloc(8)
  head.writeUInt32BE(8 + body.length)
  head.write(type, 4, 'latin1')
  return Buffer.concat([head, body])
}

function fullBox(type, version, flags, ...payload) {
  return box(type, Buffer.from([version, (flags >> 16) & 255, (flags >> 8) & 255, flags & 255]), ...payload)
}

const u8 = (value) => Buffer.from([value])
const u16 = (value) => {
  const buffer = Buffer.alloc(2)
  buffer.writeUInt16BE(value)
  return buffer
}
const u32 = (value) => {
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32BE(value)
  return buffer
}
const zeros = (length) => Buffer.alloc(length)
const u32s = (values) => Buffer.concat(values.map(u32))

/** The identity transform, in 16.16 / 2.30 fixed point. */
const MATRIX = u32s([0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000])
const MOVIE_TIMESCALE = 1000
/** 'und', packed as three 5-bit letters. */
const LANGUAGE_UND = 0x55c4

/** An MPEG-4 descriptor: tag, length, body. */
function descriptor(tag, ...payload) {
  const body = Buffer.concat(payload)
  if (body.length > 127) throw new Error('descriptor too long for a one-byte length')
  return Buffer.concat([u8(tag), u8(body.length), body])
}

function sampleEntryVideo({ width, height, avcC }) {
  return box(
    'avc1',
    zeros(6),
    u16(1), // data reference index
    zeros(16), // pre-defined and reserved
    u16(width),
    u16(height),
    u32(0x00480000), // 72 dpi
    u32(0x00480000),
    zeros(4),
    u16(1), // frames per sample
    zeros(32), // compressor name
    u16(0x0018), // depth
    u16(0xffff),
    box('avcC', avcC),
  )
}

function sampleEntryAudio({ sampleRate, channels, asc, bitrate }) {
  const esds = fullBox(
    'esds',
    0,
    0,
    descriptor(
      0x03, // ES descriptor
      u16(1), // ES ID
      u8(0),
      descriptor(
        0x04, // decoder config
        u8(0x40), // MPEG-4 audio
        u8(0x15), // audio stream
        Buffer.from([0, 0x18, 0]), // buffer size
        u32(bitrate),
        u32(bitrate),
        descriptor(0x05, asc), // AudioSpecificConfig
      ),
      descriptor(0x06, u8(0x02)), // SL config: MP4
    ),
  )
  return box('mp4a', zeros(6), u16(1), zeros(8), u16(channels), u16(16), zeros(4), u32(sampleRate * 65536), esds)
}

function track({ id, kind, timescale, samples, entry, width = 0, height = 0, offsets }) {
  const duration = samples.reduce((sum, sample) => sum + sample.duration, 0)
  const movieDuration = Math.round((duration / timescale) * MOVIE_TIMESCALE)

  // Run-length encoded sample durations.
  const runs = []
  for (const sample of samples) {
    const last = runs.at(-1)
    if (last && last[1] === sample.duration) last[0]++
    else runs.push([1, sample.duration])
  }

  // Sync samples (1-based); audio frames are all sync samples, so audio has none.
  const keys = samples.flatMap((sample, index) => (sample.key ? [index + 1] : []))
  const stbl = box(
    'stbl',
    fullBox('stsd', 0, 0, u32(1), entry),
    fullBox('stts', 0, 0, u32(runs.length), ...runs.map(([count, delta]) => u32s([count, delta]))),
    kind === 'video' ? fullBox('stss', 0, 0, u32(keys.length), u32s(keys)) : [],
    fullBox('stsc', 0, 0, u32(1), u32s([1, 1, 1])),
    fullBox('stsz', 0, 0, u32(0), u32(samples.length), u32s(samples.map((sample) => sample.data.length))),
    fullBox('stco', 0, 0, u32(samples.length), u32s(offsets)),
  )
  const header =
    kind === 'video' ? fullBox('vmhd', 0, 1, zeros(8)) : fullBox('smhd', 0, 0, zeros(4))
  const minf = box('minf', header, box('dinf', fullBox('dref', 0, 0, u32(1), fullBox('url ', 0, 1))), stbl)
  const handler = kind === 'video' ? ['vide', 'VideoHandler'] : ['soun', 'SoundHandler']
  const mdia = box(
    'mdia',
    fullBox('mdhd', 0, 0, u32(0), u32(0), u32(timescale), u32(duration), u16(LANGUAGE_UND), u16(0)),
    fullBox('hdlr', 0, 0, u32(0), Buffer.from(handler[0], 'latin1'), zeros(12), Buffer.from(`${handler[1]}\0`, 'latin1')),
    minf,
  )
  const tkhd = fullBox(
    'tkhd',
    0,
    3, // enabled, in movie
    u32(0),
    u32(0),
    u32(id),
    zeros(4),
    u32(movieDuration),
    zeros(8),
    u16(0), // layer
    u16(kind === 'video' ? 0 : 1), // alternate group
    u16(kind === 'video' ? 0 : 0x0100), // volume
    zeros(2),
    MATRIX,
    u32(width * 65536),
    u32(height * 65536),
  )
  return { box: box('trak', tkhd, mdia), movieDuration }
}

/**
 * @param {{
 *   video: { width: number, height: number, fps: number, avcC: Uint8Array, samples: { key: boolean, data: Uint8Array }[] },
 *   audio?: { sampleRate: number, channels: number, bitrate: number, asc: Uint8Array, samples: { data: Uint8Array }[] },
 * }} input
 * @returns {Buffer}
 */
export function writeMp4({ video, audio }) {
  if (!video.samples[0]?.key) throw new Error('the video must start with a keyframe')
  const VIDEO_TIMESCALE = video.fps * 1000
  const videoSamples = video.samples.map((sample, index) => ({
    ...sample,
    data: Buffer.from(sample.data),
    duration: 1000,
    time: index / video.fps,
  }))
  const audioSamples = (audio?.samples ?? []).map((sample, index) => ({
    data: Buffer.from(sample.data),
    duration: 1024,
    time: (index * 1024) / audio.sampleRate,
  }))

  // Media data, interleaved by time so a player never waits on one track.
  const order = [
    ...videoSamples.map((sample) => ({ sample, track: 'video' })),
    ...audioSamples.map((sample) => ({ sample, track: 'audio' })),
  ].sort((a, b) => a.sample.time - b.sample.time || (a.track === 'video' ? -1 : 1))

  const ftyp = box('ftyp', Buffer.from('isom', 'latin1'), u32(0x200), Buffer.from('isomiso2avc1mp41', 'latin1'))

  const build = (videoOffsets, audioOffsets) => {
    const videoTrack = track({
      id: 1,
      kind: 'video',
      timescale: VIDEO_TIMESCALE,
      samples: videoSamples,
      entry: sampleEntryVideo({ width: video.width, height: video.height, avcC: Buffer.from(video.avcC) }),
      width: video.width,
      height: video.height,
      offsets: videoOffsets,
    })
    const audioTrack = audio
      ? track({
          id: 2,
          kind: 'audio',
          timescale: audio.sampleRate,
          samples: audioSamples,
          entry: sampleEntryAudio({ ...audio, asc: Buffer.from(audio.asc) }),
          offsets: audioOffsets,
        })
      : null
    const duration = Math.max(videoTrack.movieDuration, audioTrack?.movieDuration ?? 0)
    const mvhd = fullBox(
      'mvhd',
      0,
      0,
      u32(0),
      u32(0),
      u32(MOVIE_TIMESCALE),
      u32(duration),
      u32(0x00010000), // rate 1.0
      u16(0x0100), // volume 1.0
      zeros(10),
      MATRIX,
      zeros(24),
      u32(audio ? 3 : 2), // next track ID
    )
    return box('moov', mvhd, videoTrack.box, audioTrack ? audioTrack.box : [])
  }

  // The moov's size does not depend on the offsets it lists, so build it once
  // to measure, then again with the real offsets.
  const moovSize = build(videoSamples.map(() => 0), audioSamples.map(() => 0)).length
  let cursor = ftyp.length + moovSize + 8
  const videoOffsets = []
  const audioOffsets = []
  for (const { sample, track: kind } of order) {
    ;(kind === 'video' ? videoOffsets : audioOffsets).push(cursor)
    cursor += sample.data.length
  }
  const moov = build(videoOffsets, audioOffsets)
  const mdat = box('mdat', order.map(({ sample }) => sample.data))
  return Buffer.concat([ftyp, moov, mdat])
}
