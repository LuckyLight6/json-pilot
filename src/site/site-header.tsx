import { ArrowRight, Check, Github, Languages, Moon, Sun } from 'lucide-react'
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react'

import { APP_URL, REPOSITORY_URL } from './copy'
import { useSiteCopy } from './primitives'

import iconUrl from '@/assets/icon.svg'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LOCALE_PREFERENCES, useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import { THEMES, useTheme } from '@/theme'

/** The chosen option's tick, on the left like the editor's settings menu. */
const CheckMark = ({ active }: { active: boolean }) => (
  <Check className={active ? 'opacity-100' : 'opacity-0'} aria-hidden />
)

/**
 * A header dropdown. Radix hands focus back to the trigger on close, and
 * focusing an element inside the sticky header scrolls the page to the top,
 * so focus goes back without scrolling.
 */
function HeaderMenu({ trigger, children }: { trigger: ReactElement; children: ReactNode }) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild ref={triggerRef}>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-44"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          triggerRef.current?.focus({ preventScroll: true })
        }}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Language gets its own button with the familiar 文A glyph: a sun alone did
 * not say the page could be read in another language. Both menus default to
 * `system` and share the editor's storage keys, so a choice made here carries
 * over.
 */
function LanguageMenu() {
  const copy = useSiteCopy()
  const { preference, locale, setPreference } = useI18n()
  return (
    <HeaderMenu
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground size-9 rounded-full"
          aria-label={copy.nav.language}
          title={`${copy.nav.language} · ${copy.nav.languages[locale]}`}
        >
          <Languages className="size-4" aria-hidden />
        </Button>
      }
    >
      <DropdownMenuLabel>{copy.nav.language}</DropdownMenuLabel>
      {LOCALE_PREFERENCES.map((option) => (
        <DropdownMenuItem key={option} onClick={() => setPreference(option)}>
          <CheckMark active={preference === option} />
          {copy.nav.languages[option]}
        </DropdownMenuItem>
      ))}
    </HeaderMenu>
  )
}

function ThemeMenu() {
  const copy = useSiteCopy()
  const { theme, setTheme } = useTheme()
  return (
    <HeaderMenu
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground size-9 rounded-full"
          aria-label={copy.nav.theme}
          title={copy.nav.theme}
        >
          {/* Picked by the theme class, not by script, so the prerendered
              page shows the right one before any script runs. */}
          <Sun className="size-4 dark:hidden" aria-hidden />
          <Moon className="hidden size-4 dark:block" aria-hidden />
        </Button>
      }
    >
      <DropdownMenuLabel>{copy.nav.theme}</DropdownMenuLabel>
      {THEMES.map((option) => (
        <DropdownMenuItem key={option} onClick={() => setTheme(option)}>
          <CheckMark active={theme === option} />
          {copy.nav.themes[option]}
        </DropdownMenuItem>
      ))}
    </HeaderMenu>
  )
}

/** True once the page has scrolled, so the header can grow its hairline. */
function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  return scrolled
}

export function SiteHeader() {
  const copy = useSiteCopy()
  const scrolled = useScrolled()
  const links = [
    { href: '#demo', label: copy.nav.demo },
    { href: '#features', label: copy.nav.features },
    { href: '#privacy', label: copy.nav.privacy },
  ]

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b backdrop-blur-xl transition-colors duration-300',
        scrolled ? 'bg-background/70 border-border/70' : 'border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 sm:px-6">
        <a
          href="#top"
          className="flex items-center gap-2.5 font-semibold tracking-tight underline-offset-4 focus-visible:underline"
        >
          <img src={iconUrl} alt="" className="size-7" aria-hidden />
          <span className="whitespace-nowrap">JSON Pilot</span>
        </a>

        <nav className="text-muted-foreground hidden items-center gap-1 text-sm md:flex" aria-label="Primary">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hover:text-foreground hover:bg-accent/60 focus-visible:text-foreground focus-visible:bg-accent/60 rounded-full px-3 py-1.5 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {/* On a phone there is no room for it; the CTA and footer link GitHub too. */}
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hidden size-9 rounded-full sm:inline-flex"
          >
            <a href={REPOSITORY_URL} target="_blank" rel="noreferrer" aria-label="GitHub" title="GitHub">
              <Github className="size-4" aria-hidden />
            </a>
          </Button>
          <LanguageMenu />
          <ThemeMenu />
          <Button asChild size="sm" className="ml-2 h-9 rounded-full px-4">
            <a href={APP_URL}>
              {copy.nav.openApp}
              <ArrowRight aria-hidden />
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}
