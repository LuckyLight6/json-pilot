import { ChevronDown, type LucideIcon } from 'lucide-react'

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
  /** The primary action (Format): accent-tinted, never forces layout. */
  emphasized?: boolean
  /** Opens a menu: draws a small chevron after the label. */
  menu?: boolean
}

/**
 * Toolbar affordance. What is drawn follows the toolbar style preference
 * exactly — icons, text, or both — and the accessible name and hover title are
 * always the full label.
 */
export function ToolbarButton({
  label,
  icon: Icon,
  command,
  className,
  emphasized = false,
  menu = false,
  variant = 'ghost',
  ...props
}: ToolbarButtonProps) {
  const { showIcon, showLabel } = useToolbarStyle()
  const binding = useKeybindingsStore((state) => (command ? state.bindingFor(command) : ''))
  const title = binding ? `${label} (${formatBinding(binding, IS_MAC)})` : label

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      title={title}
      aria-label={label}
      // A locale-independent handle for scripts and tests.
      data-command={command}
      className={cn(
        'h-7 shrink-0 gap-1.5 rounded-md text-xs',
        showLabel ? 'px-2.5' : 'px-2',
        menu && 'gap-1 pr-1.5',
        emphasized
          ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary focus-visible:bg-primary/15 focus-visible:text-primary font-medium'
          : 'text-muted-foreground hover:text-foreground font-normal',
        className,
      )}
      {...props}
    >
      {showIcon && <Icon aria-hidden className="size-3.5" />}
      {showLabel && <span>{label}</span>}
      {menu && <ChevronDown aria-hidden className="size-3 opacity-60" />}
    </Button>
  )
}
