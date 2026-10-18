import { bindingKeys, isMacPlatform } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'

const IS_MAC = isMacPlatform()

const KEY_SIZES = {
  /** Menus, the query bar, the status bar. */
  sm: 'h-[18px] min-w-[18px] px-1 text-[10px] rounded-[4px]',
  /** The shortcuts dialog, where the binding is the content. */
  md: 'h-6 min-w-6 px-1.5 text-xs rounded-md',
} as const

/**
 * A binding drawn as keycaps — one per key, chords of a sequence set apart —
 * so `⌥⇧F` reads as three keys rather than one glyph string, and `⌘K ⌘0` as
 * two presses. Renders nothing for an unbound command.
 */
export function KeyCombo({
  binding,
  size = 'sm',
  className,
}: {
  binding: string
  size?: keyof typeof KEY_SIZES
  className?: string
}) {
  const chords = bindingKeys(binding, IS_MAC)
  if (chords.length === 0) return null

  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5', className)} aria-hidden>
      {chords.map((keys, chordIndex) => (
        <span key={chordIndex} className="inline-flex items-center gap-0.5">
          {keys.map((key, keyIndex) => (
            <kbd
              key={keyIndex}
              className={cn(
                'bg-background text-muted-foreground inline-flex items-center justify-center border border-b-2 font-sans leading-none font-medium tabular-nums',
                KEY_SIZES[size],
              )}
            >
              {key}
            </kbd>
          ))}
        </span>
      ))}
    </span>
  )
}
