/**
 * The intro film's soundtrack, synthesised: an original 120 BPM piece in A
 * minor, with a sound effect for every cue the picture emits (promo.js).
 * Rendered offline with a seeded noise source, so it comes out the same on
 * every render and needs no licence.
 *
 * Shape: two bars of pad and riser under the logo, eight bars of groove
 * (four-on-the-floor, offbeat bass, plucked arpeggio through a dotted-eighth
 * delay) under the four features, and a two-bar F → C resolve for the end
 * card, faded to silence so the film loops cleanly.
 *
 * Pass `bed` (a decoded AudioBuffer) to score the film with a licensed track
 * instead; the sound effects are laid over it either way.
 */

const hz = (note) => 440 * 2 ** ((note - 69) / 12)

/** One chord per bar: pad voicing (MIDI notes) and bass root. */
const AM = { notes: [57, 60, 64, 71], bass: 33 }
const F = { notes: [53, 57, 60, 64], bass: 29 }
const C = { notes: [60, 64, 67, 74], bass: 36 }
const G = { notes: [55, 59, 62, 64], bass: 31 }
const CHORDS = [AM, AM, AM, F, C, G, AM, F, C, G, F, C]

/** Bars (0-based) where the groove plays, and where it is at full strength. */
const GROOVE = [2, 10]
const FULL = [4, 10]

function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export async function renderMusic({ duration, bpm, cues, sampleRate = 48000, bed = null }) {
  const ctx = new OfflineAudioContext({ numberOfChannels: 2, length: Math.ceil(duration * sampleRate), sampleRate })
  const beat = 60 / bpm
  const bar = beat * 4
  const random = seeded(11)
  const chordAt = (t) => CHORDS[Math.min(CHORDS.length - 1, Math.max(0, Math.floor(t / bar)))]

  // --- Buses ------------------------------------------------------------------
  const master = new GainNode(ctx, { gain: 0.8 })
  const compressor = new DynamicsCompressorNode(ctx, { threshold: -14, knee: 6, ratio: 3, attack: 0.005, release: 0.2 })
  master.connect(compressor).connect(ctx.destination)
  // Fade the last half second out, so the loop point is silent.
  master.gain.setValueAtTime(0.8, duration - 0.5)
  master.gain.linearRampToValueAtTime(0, duration)

  const noise = new AudioBuffer({ numberOfChannels: 1, length: sampleRate * 2, sampleRate })
  const samples = noise.getChannelData(0)
  for (let i = 0; i < samples.length; i++) samples[i] = random() * 2 - 1

  // A generated room: stereo noise under an exponential decay.
  const impulse = new AudioBuffer({ numberOfChannels: 2, length: Math.floor(sampleRate * 2.6), sampleRate })
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel)
    for (let i = 0; i < data.length; i++) data[i] = (random() * 2 - 1) * Math.exp((-3.2 * i) / sampleRate)
  }
  const reverb = new ConvolverNode(ctx, { buffer: impulse })
  reverb.connect(new GainNode(ctx, { gain: 0.32 })).connect(master)

  // Dotted-eighth echo, darkening with every repeat, feeding the room too.
  const delay = new DelayNode(ctx, { delayTime: beat * 0.75, maxDelayTime: 2 })
  const delayTone = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 3200 })
  delay.connect(delayTone).connect(new GainNode(ctx, { gain: 0.38 })).connect(delay)
  const delayReturn = new GainNode(ctx, { gain: 0.3 })
  delayTone.connect(delayReturn).connect(master)
  delayReturn.connect(reverb)

  // Music ducks under every kick; effects sit beside it, never ducked.
  const pump = new GainNode(ctx, { gain: 1 })
  const music = new GainNode(ctx, { gain: 1 })
  music.connect(pump).connect(master)
  const fx = new GainNode(ctx, { gain: 0.9 })
  fx.connect(master)

  // --- Voices -----------------------------------------------------------------

  /** Pans `node` into `out` with optional sends; returns every node it made, panner first. */
  function route(node, { pan = 0, out = music, reverbSend = 0, delaySend = 0 }) {
    const panner = new StereoPannerNode(ctx, { pan })
    node.connect(panner).connect(out)
    const made = [panner]
    for (const [amount, target] of [[reverbSend, reverb], [delaySend, delay]]) {
      if (!amount) continue
      const send = new GainNode(ctx, { gain: amount })
      panner.connect(send).connect(target)
      made.push(send)
    }
    return made
  }

  /**
   * A finished voice still costs render time while it stays wired into the
   * mix, so each one unplugs itself when its source stops.
   */
  function release(source, nodes) {
    source.onended = () => {
      for (const node of nodes) node.disconnect()
    }
  }

  /**
   * Voices are built just in time (see the scheduler below): `voice(build)`
   * returns a function taking the start time first, which queues `build` —
   * or runs it at once when one voice starts another while being built.
   */
  const queue = []
  let building = false
  const voice =
    (build) =>
    (t, ...rest) => {
      if (building) build(t, ...rest)
      else queue.push({ t, run: () => build(t, ...rest) })
    }

  /** A struck tone: fast attack, exponential decay (`decay` ≈ time to silence). */
  const tone = voice((t, { note, freq = hz(note), glideTo, glide = 0.06, type = 'sine', level = 0.1, attack = 0.004, decay = 0.25, lowpass, ...sends }) => {
    const osc = new OscillatorNode(ctx, { type, frequency: freq })
    if (glideTo) {
      osc.frequency.setValueAtTime(freq, t)
      osc.frequency.exponentialRampToValueAtTime(glideTo, t + glide)
    }
    const gain = new GainNode(ctx, { gain: 0 })
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(level, t + attack)
    gain.gain.setTargetAtTime(0, t + attack, decay / 4)
    const filter = lowpass && new BiquadFilterNode(ctx, { type: 'lowpass', frequency: lowpass })
    ;(filter ? osc.connect(filter) : osc).connect(gain)
    release(osc, [osc, filter, gain, ...route(gain, sends)].filter(Boolean))
    osc.start(t)
    osc.stop(t + attack + decay * 1.6 + 0.05)
  })

  /** A burst of filtered noise. */
  const hiss = voice((t, { level, decay, attack = 0.001, filter = 'bandpass', freq = 1000, q = 0.8, ...sends }) => {
    const source = new AudioBufferSourceNode(ctx, { buffer: noise })
    const band = new BiquadFilterNode(ctx, { type: filter, frequency: freq, Q: q })
    const gain = new GainNode(ctx, { gain: 0 })
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(level, t + attack)
    gain.gain.setTargetAtTime(0, t + attack, decay / 4)
    source.connect(band).connect(gain)
    release(source, [source, band, gain, ...route(gain, { out: fx, ...sends })])
    source.start(t, random() * 1.2)
    source.stop(t + attack + decay * 1.6 + 0.05)
  })

  /** Noise swept through a band-pass: risers, whooshes, swishes. */
  const sweep = voice((t, len, { from, to, peak = 0.25, level = 0.22, panFrom = 0, panTo = 0, q = 1.2, ...sends }) => {
    const source = new AudioBufferSourceNode(ctx, { buffer: noise, loop: true })
    const filter = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: from, Q: q })
    filter.frequency.setValueAtTime(from, t)
    filter.frequency.exponentialRampToValueAtTime(to, t + len)
    const gain = new GainNode(ctx, { gain: 0 })
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(level, t + len * peak)
    gain.gain.linearRampToValueAtTime(0, t + len)
    source.connect(filter).connect(gain)
    const routed = route(gain, { out: fx, ...sends })
    routed[0].pan.setValueAtTime(panFrom, t)
    routed[0].pan.linearRampToValueAtTime(panTo, t + len)
    release(source, [source, filter, gain, ...routed])
    source.start(t, random())
    source.stop(t + len + 0.05)
  })

  const kick = voice((t, level = 0.95) => {
    const osc = new OscillatorNode(ctx, { type: 'sine', frequency: 150 })
    osc.frequency.setValueAtTime(150, t)
    osc.frequency.exponentialRampToValueAtTime(46, t + 0.11)
    const gain = new GainNode(ctx, { gain: 0 })
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(level, t + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42)
    osc.connect(gain).connect(master)
    release(osc, [osc, gain])
    osc.start(t)
    osc.stop(t + 0.45)
    hiss(t, { level: 0.18 * level, decay: 0.012, filter: 'highpass', freq: 3000, out: master })
    pump.gain.setValueAtTime(0.5, t)
    pump.gain.setTargetAtTime(1, t + 0.02, 0.08)
  })

  function clap(t, level = 0.3) {
    for (const offset of [0, 0.011, 0.023]) hiss(t + offset, { level, decay: 0.012, freq: 1300, out: music })
    hiss(t + 0.03, { level: level * 0.8, decay: 0.14, freq: 1200, out: music, reverbSend: 0.3 })
  }

  function hat(t, { open = false, level = 0.1 } = {}) {
    hiss(t, { level, decay: open ? 0.16 : 0.03, filter: 'highpass', freq: 7600, q: 0.7, out: music, pan: open ? 0.15 : -0.1 })
  }

  const bass = voice((t, note, len = beat * 0.42) => {
    for (const [type, octave, level] of [['sine', 0, 0.5], ['triangle', 12, 0.12]]) {
      const osc = new OscillatorNode(ctx, { type, frequency: hz(note + octave) })
      const gain = new GainNode(ctx, { gain: 0 })
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(level, t + 0.01)
      gain.gain.setValueAtTime(level, t + len - 0.04)
      gain.gain.linearRampToValueAtTime(0, t + len)
      osc.connect(gain).connect(music)
      release(osc, [osc, gain])
      osc.start(t)
      osc.stop(t + len + 0.02)
    }
  })

  /** A sustained chord of three detuned saws per note, opening as it plays. */
  const pad = voice((t, len, notes, { level = 0.028, attack = 0.5, fade = 0.9 } = {}) => {
    const filter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 700, Q: 0.6 })
    filter.frequency.setValueAtTime(700, t)
    filter.frequency.linearRampToValueAtTime(1700, t + len)
    const gain = new GainNode(ctx, { gain: 0 })
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(level, t + attack)
    gain.gain.setValueAtTime(level, t + len)
    gain.gain.linearRampToValueAtTime(0, t + len + fade)
    filter.connect(gain)
    const shared = [filter, gain, ...route(gain, { reverbSend: 0.55 })]
    for (const note of notes) {
      for (const detune of [-9, 0, 8]) {
        const osc = new OscillatorNode(ctx, { type: 'sawtooth', frequency: hz(note), detune })
        osc.connect(filter)
        // All stop together; the first one's release unplugs the shared chain too.
        release(osc, [osc, ...shared.splice(0)])
        osc.start(t)
        osc.stop(t + len + fade + 0.05)
      }
    }
  })

  const pluck = (t, note, level = 0.075, pan = 0) =>
    tone(t, { note, type: 'triangle', level, decay: 0.22, lowpass: 2800, pan, delaySend: 0.35, reverbSend: 0.12 })

  // --- Score ----------------------------------------------------------------

  if (bed) {
    const source = new AudioBufferSourceNode(ctx, { buffer: bed })
    source.connect(new GainNode(ctx, { gain: 0.85 })).connect(master)
    source.start(0)
  } else {
    // Intro: the chord swells under the logo; a riser lifts into the groove.
    pad(0, bar * 2 - 0.3, AM.notes, { attack: 1.6, fade: 0.8 })
    tone(0, { note: AM.bass + 12, level: 0.18, attack: 1.5, decay: 4, out: music })
    for (let i = 0; i < 8; i++) pluck(i * beat, AM.notes[i % 4] + 12, 0.035 + i * 0.004, i % 2 ? 0.35 : -0.35)
    sweep(bar * 1.25, bar * 0.75, { from: 300, to: 7000, peak: 0.97, level: 0.2, q: 1.6, reverbSend: 0.4 })

    for (let index = GROOVE[0]; index < GROOVE[1]; index++) {
      const start = index * bar
      const chord = CHORDS[index]
      const full = index >= FULL[0]
      const fill = index === GROOVE[1] - 1
      pad(start, bar, chord.notes, { level: full ? 0.026 : 0.02, attack: 0.25, fade: 0.5 })
      for (let b = 0; b < 4; b++) {
        const t = start + b * beat
        // The last beat before the end card drops the kick, for the lift.
        if (!(fill && b === 3)) kick(t)
        bass(t + beat / 2, chord.bass)
        if (full && (b === 1 || b === 3) && !(fill && b === 3)) clap(t)
        hat(t + beat / 2, { open: full && b === 3, level: 0.11 })
        if (full) for (const sixteenth of [0.25, 0.75]) hat(t + beat * sixteenth, { level: 0.045 })
      }
      // The arpeggio: chord tones an octave up, sixteenths, rolling up and back.
      const order = [0, 1, 2, 3, 2, 1, 3, 2]
      const arpLevel = full ? 0.07 : 0.045
      for (let s = 0; s < 16; s++) {
        if (!full && s % 2) continue
        pluck(start + s * (beat / 4), chord.notes[order[s % 8]] + 12, s % 4 === 0 ? arpLevel : arpLevel * 0.7, s % 2 ? 0.3 : -0.3)
      }
      if (fill) {
        // Snare roll and riser into the end card.
        for (let s = 0; s < 8; s++) hiss(start + bar / 2 + s * (beat / 4), { level: 0.06 + s * 0.03, decay: 0.07, freq: 1500, out: music })
        sweep(start, bar, { from: 400, to: 9000, peak: 0.98, level: 0.18, q: 1.4, reverbSend: 0.4 })
      }
    }

    // End card: F, then home to C, the arpeggio slowing to a stop.
    const end = GROOVE[1] * bar
    pad(end, bar, F.notes, { level: 0.03, attack: 0.05, fade: 0.6 })
    pad(end + bar, bar * 0.55, C.notes, { level: 0.03, attack: 0.4, fade: 0.85 })
    tone(end, { note: F.bass + 12, level: 0.3, attack: 0.01, decay: 2.2, out: music })
    tone(end + bar, { note: C.bass + 12, level: 0.26, attack: 0.05, decay: 2, out: music })
    for (let i = 0; i < 6; i++) {
      const chord = i < 4 ? F : C
      pluck(end + i * beat * (i < 4 ? 1 : 1.5), chord.notes[(i * 2) % 4] + 12, 0.06 - i * 0.008, i % 2 ? 0.3 : -0.3)
    }
  }

  // --- Sound effects, one per cue ---------------------------------------------

  const counts = {}
  const SFX = {
    whoosh: (t) => sweep(t, 0.55, { from: 500, to: 3600, peak: 0.7, level: 0.24, panFrom: -0.6, panTo: 0.4, reverbSend: 0.3 }),
    land: (t) => {
      tone(t, { freq: 130, glideTo: 60, glide: 0.12, level: 0.35, decay: 0.2, out: fx })
      tone(t, { note: 88, level: 0.08, decay: 0.9, out: fx, reverbSend: 0.5 })
      tone(t + 0.07, { note: 95, level: 0.045, decay: 0.8, out: fx, reverbSend: 0.5, pan: 0.2 })
    },
    impact: (t) => {
      tone(t, { freq: 92, glideTo: 32, glide: 0.5, level: 0.7, decay: 1.1, out: fx })
      hiss(t, { level: 0.22, decay: 0.45, filter: 'lowpass', freq: 1100, reverbSend: 0.55 })
    },
    key: (t) => {
      hiss(t, { level: 0.22, decay: 0.012, filter: 'highpass', freq: 2500 })
      tone(t, { freq: 190, level: 0.22, decay: 0.06, out: fx })
    },
    cascade: (t) => {
      const scale = [69, 72, 74, 76, 79, 81, 84, 86, 88, 91]
      for (const [i, note] of scale.entries()) {
        tone(t + i * 0.045, { note, type: 'triangle', level: 0.07, decay: 0.3, out: fx, pan: -0.5 + i * 0.11, delaySend: 0.2, reverbSend: 0.3 })
      }
    },
    click: (t) => {
      hiss(t, { level: 0.28, decay: 0.008, filter: 'highpass', freq: 1800 })
      tone(t, { freq: 1700, level: 0.05, decay: 0.02, out: fx })
    },
    sparkle: (t) => {
      for (const [i, note] of [88, 91, 93, 96, 100].entries()) {
        tone(t + i * 0.06, { note, level: 0.05, decay: 0.7, out: fx, pan: i % 2 ? 0.4 : -0.4, delaySend: 0.35, reverbSend: 0.5 })
      }
    },
    type: (t) => hiss(t, { level: 0.05 + random() * 0.04, decay: 0.008, filter: 'highpass', freq: 4200, pan: random() * 0.4 - 0.2 }),
    enter: (t) => {
      hiss(t, { level: 0.25, decay: 0.012, filter: 'highpass', freq: 2200 })
      tone(t, { freq: 150, level: 0.28, decay: 0.08, out: fx })
      tone(t, { note: 81, level: 0.05, decay: 0.3, out: fx, reverbSend: 0.3 })
    },
    pop: (t) => {
      const n = (counts.pop = (counts.pop ?? 0) + 1)
      tone(t, { freq: 360 * n, glideTo: 980 * n, glide: 0.07, level: 0.14, decay: 0.12, out: fx, pan: n % 2 ? -0.25 : 0.25 })
    },
    switch: (t) => {
      hiss(t, { level: 0.14, decay: 0.01, freq: 3000 })
      tone(t, { note: 76, level: 0.06, decay: 0.08, out: fx })
    },
    reveal: (t) => {
      tone(t, { freq: 90, glideTo: 40, glide: 0.35, level: 0.45, decay: 0.6, out: fx })
      for (const [i, note] of chordAt(t).notes.entries()) {
        tone(t + i * 0.03, { note: note + 24, level: 0.05, decay: 1.1, out: fx, pan: -0.3 + i * 0.2, reverbSend: 0.5 })
      }
    },
    swish: (t) => {
      sweep(t, 0.6, { from: 3800, to: 500, peak: 0.3, level: 0.16, panFrom: -0.8, panTo: -0.2, reverbSend: 0.2 })
      sweep(t, 0.6, { from: 3600, to: 520, peak: 0.3, level: 0.16, panFrom: 0.8, panTo: 0.2, reverbSend: 0.2 })
    },
    tick: (t) => {
      const n = (counts.tick = (counts.tick ?? 0) + 1) - 1
      const notes = chordAt(t).notes
      const note = notes[n % notes.length] + 24
      tone(t, { note, level: 0.07, decay: 0.25, out: fx, pan: n % 2 ? 0.35 : -0.35 })
      tone(t, { note: note + 24, level: 0.015, decay: 0.08, out: fx })
    },
    finale: (t) => {
      for (const [i, note] of [72, 76, 79, 84, 88].entries()) {
        tone(t + 0.8 + i * 0.05, { note, level: 0.045, decay: 2.4, out: fx, reverbSend: 0.6, pan: -0.4 + i * 0.2 })
      }
    },
  }
  for (const { t, type } of cues) SFX[type]?.(t)

  // The scheduler: build the first half second's voices now, then pause the
  // render every half second to build the next. The graph only ever holds the
  // voices sounding around the playhead, which keeps rendering fast.
  queue.sort((a, b) => a.t - b.t)
  const WINDOW = 0.5
  let next = 0
  const buildUntil = (time) => {
    building = true
    while (next < queue.length && queue[next].t < time) queue[next++].run()
    building = false
  }
  buildUntil(WINDOW)
  for (let time = WINDOW; time < duration; time += WINDOW) {
    void ctx.suspend(time).then(() => {
      buildUntil(time + WINDOW)
      void ctx.resume()
    })
  }

  const rendered = await ctx.startRendering()

  // Normalise to -1 dBFS.
  let peak = 0
  for (let channel = 0; channel < rendered.numberOfChannels; channel++) {
    for (const sample of rendered.getChannelData(channel)) peak = Math.max(peak, Math.abs(sample))
  }
  const gain = peak > 0 ? 0.891 / peak : 1
  for (let channel = 0; channel < rendered.numberOfChannels; channel++) {
    const data = rendered.getChannelData(channel)
    for (let i = 0; i < data.length; i++) data[i] *= gain
  }
  return rendered
}
