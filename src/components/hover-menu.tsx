import { useEffect, useRef, useState, type ComponentProps, type ReactElement, type ReactNode } from 'react'

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui'

/**
 * Radix types `onOpenAutoFocus` as private to its menu, but forwards it to the
 * focus scope at runtime, where preventing it skips focusing the menu.
 */
type ContentProps = ComponentProps<typeof DropdownMenuContent> & { onOpenAutoFocus?: (event: Event) => void }
const Content = DropdownMenuContent as (props: ContentProps) => ReactElement

/** Long enough to cross the gap between button and menu, short enough to feel instant. */
const CLOSE_DELAY_MS = 160
const OPEN_DELAY_MS = 60

/**
 * A toolbar dropdown that opens on hover as well as on click or keyboard.
 *
 * Hovering must not take focus: someone typing in the editor who sweeps the
 * pointer across the toolbar would otherwise lose their caret to the menu, and
 * get it back on the button instead of the editor when the menu closed. Only a
 * keyboard-opened menu moves focus into itself, as a keyboard user expects.
 */
export function HoverMenu({
  trigger,
  children,
  align = 'start',
  className,
}: {
  trigger: ReactElement
  children: ReactNode
  align?: 'start' | 'end'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const openedBy = useRef<'pointer' | 'keyboard'>('pointer')
  /** Where focus was before a pointer opened the menu, to hand it back on close. */
  const previousFocus = useRef<HTMLElement | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const schedule = (next: boolean, delay: number) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (next && !open) {
        openedBy.current = 'pointer'
        previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      }
      setOpen(next)
    }, delay)
  }
  // Touch has no hover; a tap goes through Radix's own click handling.
  const onEnter = (event: React.PointerEvent) => event.pointerType === 'mouse' && schedule(true, OPEN_DELAY_MS)
  const onLeave = (event: React.PointerEvent) => event.pointerType === 'mouse' && schedule(false, CLOSE_DELAY_MS)

  return (
    // Non-modal: the rest of the page stays live, so leaving the menu is noticed.
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger
        asChild
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        onPointerDown={(event) => {
          // Already open from hovering: a click should keep it open, not toggle it shut.
          if (open && event.pointerType === 'mouse') event.preventDefault()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') openedBy.current = 'keyboard'
        }}
      >
        {trigger}
      </DropdownMenuTrigger>
      <Content
        align={align}
        className={className}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        onOpenAutoFocus={(event) => {
          if (openedBy.current === 'pointer') event.preventDefault()
        }}
        onCloseAutoFocus={(event) => {
          if (openedBy.current === 'pointer') {
            event.preventDefault()
            previousFocus.current?.focus({ preventScroll: true })
          }
          openedBy.current = 'pointer'
          previousFocus.current = null
        }}
      >
        {children}
      </Content>
    </DropdownMenu>
  )
}
