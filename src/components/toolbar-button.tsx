import type { LucideIcon } from 'lucide-react'

import type { CommandId } from '@/commands/registry'
import { Button } from '@/components/ui'
import { formatBinding, isMacPlatform } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { useKeybindingsStore } from '@/store/keybindings-store'
import { useToolbarStyle } from '@/store/preferences-store'

const IS_MAC = isMacPlatform()

interface ToolbarButtonProps extends Omit<React.ComponentProps<typeof Button>, 'children'> {
  label: string
  icon: LucideIcon
  /** When set, the hover title also spells out the current shortcut. */
  command?: CommandId
  /** Primary chrome action (Format / Minify): accent-tinted, never forces layout. */
  emphasized?: boolean
}

/**
 * Toolbar affordance. What is drawn follows the toolbar style preference, but
 * the accessible name and the hover title are always the full label.
 */
export function ToolbarButton({
  label,
  icon: Icon,
  command,
  className,
  emphasized = false,
  variant = 'ghost',
  ...props
}: ToolbarButtonProps) {
  // The toolbar style preference always wins — emphasis is colour, not layout.
  const { showIcon: withIcon, showLabel: withLabel } = useToolbarStyle()
  const binding = useKeybindingsStore((state) => (command ? state.bindingFor(command) : ''))
  const title = binding ? label + ' (' + formatBinding(binding, IS_MAC) + ')' : label

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      title={title}
      aria-label={label}
      className={cn(
        'h-7 gap-1.5 rounded-md text-xs',
        withLabel ? 'px-2.5' : 'px-2',
        emphasized
          ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary font-medium'
          : 'text-muted-foreground hover:text-foreground font-normal',
        className,
      )}
      {...props}
    >
      {withIcon && <Icon aria-hidden className="size-3.5" />}
      {withLabel && <span>{label}</span>}
    </Button>
  )
}
