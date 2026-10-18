import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useSiteCopy } from './primitives'

import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import { useTheme } from '@/theme'

/**
 * The intro film, one per locale and theme, so it speaks the visitor's
 * language and matches the page around it. Files live in `public/media/`;
 * `scripts/render-promo.mjs` renders them from `scripts/promo/`.
 */
function mediaPath(locale: string, theme: string, extension: string): string {
  return `./media/promo-${locale}-${theme}.${extension}`
}


/** Controls float on the film as frosted glass in the page's own colours. */
const CONTROL =
  'bg-background/70 text-foreground hover:bg-background/90 focus-visible:bg-background/90 flex size-9 items-center justify-center rounded-full border border-foreground/10 shadow-sm backdrop-blur-md transition-[background-color,opacity]'

/** Lets the hero's "Watch the demo" button start the film from its own click. */
const playRequests = new Set<() => void>()
export function playDemo(): void {
  for (const play of playRequests) play()
}

/**
 * The film waits for the visitor: nothing downloads until they press play
 * (only the poster loads), and then it plays once, with sound — they asked
 * for it. Scrolling away pauses it.
 */
export function DemoVideo() {
  const copy = useSiteCopy()
  const { locale } = useI18n()
  const { resolvedTheme } = useTheme()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  /** Until the film first plays, the posters show instead of the video element. */
  const [started, setStarted] = useState(false)
  /** Where the previous file was when the theme or language swapped it, and whether it was playing. */
  const resume = useRef({ at: 0, playing: false })

  const source = mediaPath(locale, resolvedTheme, 'mp4')

  const play = () => void videoRef.current?.play().catch(() => {})

  // Switching theme or language swaps the file; the new one carries on from
  // the same moment, playing if the old one was, with the same sound setting.
  useEffect(() => {
    const video = videoRef.current
    if (video && resume.current.playing) void video.play().catch(() => {})
    return () => {
      if (video) resume.current = { at: video.currentTime, playing: !video.paused }
    }
  }, [source])

  useEffect(() => {
    playRequests.add(play)
    return () => {
      playRequests.delete(play)
    }
  })

  // Pause when scrolled out of view; it waits there for the visitor to come back.
  useEffect(() => {
    const video = videoRef.current
    if (!video || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => !entry.isIntersecting && video.pause(), { threshold: 0.2 })
    observer.observe(video)
    return () => observer.disconnect()
  }, [source])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) play()
    else video.pause()
  }

  const toggleSound = () => {
    const video = videoRef.current
    if (video) video.muted = !video.muted
  }

  return (
    // An even, close shadow: a long offset one made the sides look bowed. The
    // background is each film's own, so the frame never flashes while it loads.
    <div className="group relative aspect-[16/10] overflow-hidden rounded-2xl border bg-[#f4f7fb] shadow-[0_1px_2px_oklch(0_0_0/0.04),0_6px_20px_oklch(0_0_0/0.06)] dark:bg-[#060a12] dark:shadow-none">
      {/* Posters as images, picked by the theme class rather than by script, so
          the prerendered page already shows the right one — and, lazy, they
          wait until the film is near the viewport. */}
      <img
        src={mediaPath(locale, 'light', 'webp')}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full object-cover dark:hidden"
      />
      <img
        src={mediaPath(locale, 'dark', 'webp')}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 hidden size-full object-cover dark:block"
      />
      <video
        key={source}
        ref={videoRef}
        className={cn('absolute inset-0 size-full object-cover', !started && 'opacity-0')}
        muted={muted}
        playsInline
        preload="none"
        aria-label={copy.demo.title}
        onPlay={() => {
          setStarted(true)
          setPlaying(true)
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setProgress(0)}
        onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
        onLoadedMetadata={(event) => {
          if (resume.current.at) event.currentTarget.currentTime = resume.current.at
        }}
        onTimeUpdate={(event) => {
          const { currentTime, duration } = event.currentTarget
          setProgress(duration ? currentTime / duration : 0)
        }}
      >
        <source src={source} type="video/mp4" />
      </video>

      {/* Low in the frame, clear of the poster's logo and wordmark. */}
      {!playing && (
        <button
          type="button"
          onClick={play}
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:bg-primary/90 absolute bottom-3 left-1/2 flex h-9 -translate-x-1/2 items-center gap-2 rounded-full pr-4 pl-3.5 text-xs font-medium sm:bottom-6 sm:h-11 sm:pr-5 sm:pl-4 sm:text-sm shadow-lg transition-[background-color,translate] hover:-translate-y-0.5 focus-visible:-translate-y-0.5"
        >
          <Play className="size-4 fill-current" aria-hidden />
          {copy.demo.play}
        </button>
      )}

      {playing && (
        <div className="absolute right-4 bottom-4 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={toggleSound}
            aria-label={muted ? copy.demo.soundOn : copy.demo.soundOff}
            title={muted ? copy.demo.soundOn : copy.demo.soundOff}
            className={CONTROL}
          >
            {muted ? <VolumeX className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
          </button>
          <button type="button" onClick={togglePlay} aria-label={copy.demo.pause} title={copy.demo.pause} className={CONTROL}>
            <Pause className="size-4" aria-hidden />
          </button>
        </div>
      )}

      {progress > 0 && (
        <div className="bg-foreground/10 absolute inset-x-0 bottom-0 h-0.5" aria-hidden>
          <div className="bg-primary h-full origin-left" style={{ transform: `scaleX(${progress})` }} />
        </div>
      )}
    </div>
  )
}
