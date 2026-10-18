import { ArrowRight, Github, PlayCircle } from 'lucide-react'
import { useEffect } from 'react'

import { APP_URL, REPOSITORY_URL } from './copy'
import { DemoVideo, playDemo } from './demo-video'
import { Features } from './features'
import { Reveal, SectionHeading, useSiteCopy } from './primitives'
import { SiteHeader } from './site-header'

import iconUrl from '@/assets/icon.svg'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'

/** Keeps the tab title and description in the visitor's language. */
function useDocumentMeta() {
  const copy = useSiteCopy()
  useEffect(() => {
    document.title = copy.meta.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', copy.meta.description)
  }, [copy])
}

function Hero() {
  const copy = useSiteCopy()
  const { hero } = copy

  return (
    <section id="top" className="relative isolate overflow-hidden">
      <div className="site-grid absolute inset-0 -z-10" aria-hidden />
      <div className="site-wash absolute inset-x-0 top-0 -z-10 h-[560px]" aria-hidden />

      <div className="mx-auto max-w-6xl px-5 pt-20 pb-10 text-center sm:px-6 sm:pt-28">
        <Reveal>
          <a
            href={REPOSITORY_URL}
            target="_blank"
            rel="noreferrer"
            className="bg-surface-raised/80 text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:border-foreground/20 inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-medium shadow-sm backdrop-blur transition-colors"
          >
            <Github className="size-3.5" aria-hidden />
            {hero.badge}
            <ArrowRight className="size-3" aria-hidden />
          </a>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="mx-auto mt-7 max-w-5xl text-[2.6rem] leading-[1.08] font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            {hero.titleLead}
            <span className="text-primary block">{hero.titleAccent}</span>
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-base leading-relaxed text-balance sm:text-lg">
            {hero.subtitle}
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-full px-7 text-[15px] shadow-sm">
              <a href={APP_URL}>
                {hero.primary}
                <ArrowRight aria-hidden />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-6 text-[15px]">
              {/* Scrolls to the film and starts it — this click is the visitor asking for it. */}
              <a href="#demo" onClick={playDemo}>
                <PlayCircle aria-hidden />
                {hero.secondary}
              </a>
            </Button>
          </div>
          <p className="text-muted-foreground/80 mt-5 text-xs tracking-wide">{hero.footnote}</p>
        </Reveal>
      </div>

      <div id="demo" className="mx-auto max-w-6xl px-5 pt-8 pb-8 sm:px-6">
        <Reveal delay={300} className="relative">
          <DemoVideo />
          <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-center text-sm text-balance">
            {copy.demo.subtitle}
          </p>
        </Reveal>
      </div>
    </section>
  )
}

function Privacy() {
  const copy = useSiteCopy()
  const { privacy } = copy

  return (
    <section id="privacy" className="border-y bg-surface-raised/60">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-6 sm:py-28">
        <SectionHeading eyebrow={privacy.eyebrow} title={privacy.title} subtitle={privacy.subtitle} />
        <dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border lg:grid-cols-4">
          {privacy.stats.map((stat, index) => (
            <Reveal key={stat.label} delay={index * 80} className="bg-background">
              <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center">
                <dt className="sr-only">{stat.label}</dt>
                <dd className="text-foreground text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl">{stat.value}</dd>
                <dd className="text-muted-foreground mt-3 text-sm">{stat.label}</dd>
              </div>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  )
}

function ClosingCta() {
  const copy = useSiteCopy()
  const { cta } = copy

  return (
    <section className="mx-auto max-w-6xl px-5 py-24 sm:px-6 sm:py-32">
      <Reveal>
        {/* A dark instrument panel in both themes: the page's one moment of contrast. */}
        <div className="relative isolate overflow-hidden rounded-3xl bg-neutral-950 px-6 py-16 text-center text-white ring-1 ring-white/10 sm:px-16 sm:py-20 dark:bg-neutral-900">
          <div className="site-grid absolute inset-0 -z-10 [--site-grid-line:oklch(1_0_0/0.07)]" aria-hidden />
          <img src={iconUrl} alt="" className="mx-auto size-14 rounded-2xl shadow-xl ring-1 ring-white/15" aria-hidden />
          <h2 className="mt-7 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">{cta.title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-balance text-white/70 sm:text-lg">{cta.subtitle}</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-full px-7 text-[15px]">
              <a href={APP_URL}>
                {cta.primary}
                <ArrowRight aria-hidden />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="h-12 rounded-full px-6 text-[15px] text-white ring-1 ring-white/25 hover:bg-white/10 hover:text-white"
            >
              <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">
                <Github aria-hidden />
                {cta.secondary}
              </a>
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

function SiteFooter() {
  const copy = useSiteCopy()
  const { footer } = copy
  const links = [
    { href: APP_URL, label: footer.app },
    { href: REPOSITORY_URL, label: footer.source, external: true },
    { href: `${REPOSITORY_URL}/issues`, label: footer.issues, external: true },
  ]

  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <img src={iconUrl} alt="" className="size-6" aria-hidden />
          <div>
            <p className="text-foreground font-medium">JSON Pilot</p>
            <p className="text-xs">{footer.tagline}</p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hover:text-foreground focus-visible:text-foreground underline-offset-4 transition-colors focus-visible:underline"
              {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <p className="text-xs">
          © {new Date().getFullYear()} · {footer.credits}
        </p>
      </div>
    </footer>
  )
}

export function LandingPage() {
  const { locale } = useI18n()
  useDocumentMeta()

  return (
    // `lang` on the wrapper as well as <html>, so CJK punctuation and line
    // breaking follow the copy even before the provider's effect runs.
    <div lang={locale} className="bg-background text-foreground min-h-screen antialiased">
      <SiteHeader />
      <main>
        <Hero />
        <Features />
        <Privacy />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  )
}
