import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'

import { SITE_COPY, type SiteCopy } from './copy'

import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

/** Site copy for the active locale, which the site shares with the editor. */
export function useSiteCopy(): SiteCopy {
  return SITE_COPY[useI18n().locale]
}

/**
 * Fades its children up the first time they scroll into view. Content that is
 * already on screen at load is revealed immediately, and reduced-motion users
 * get no movement at all (see `.reveal` in `site.css`).
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  /** Milliseconds, for staggering siblings. */
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') {
      setRevealed(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setRevealed(true)
        observer.disconnect()
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const style: CSSProperties | undefined = delay ? { transitionDelay: `${delay}ms` } : undefined

  return (
    <div ref={ref} data-revealed={revealed} className={cn('reveal', className)} style={style}>
      {children}
    </div>
  )
}

/** Feeds the pointer position to `.spotlight` as `--x` / `--y`. */
export function trackSpotlight(event: PointerEvent<HTMLElement>): void {
  const rect = event.currentTarget.getBoundingClientRect()
  event.currentTarget.style.setProperty('--x', `${event.clientX - rect.left}px`)
  event.currentTarget.style.setProperty('--y', `${event.clientY - rect.top}px`)
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  className,
}: {
  eyebrow: string
  title: string
  subtitle?: string
  className?: string
}) {
  return (
    <Reveal className={cn('mx-auto max-w-2xl text-center', className)}>
      <p className="text-primary text-sm font-semibold tracking-wide">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {subtitle && (
        <p className="text-muted-foreground mt-4 text-base leading-relaxed text-balance sm:text-lg">{subtitle}</p>
      )}
    </Reveal>
  )
}
