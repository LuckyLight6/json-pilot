import {
  AlignLeft,
  ArrowDownAZ,
  ArrowLeftRight,
  ArrowUpAZ,
  Braces,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  Eraser,
  FileInput,
  FileOutput,
  GitCompare,
  Minimize2,
  Quote,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import iconUrl from '@/assets/icon.svg'
import { requestClear, type CommandId } from '@/commands/registry'
import { HoverMenu } from '@/components/hover-menu'
import { JsonStatusBadge } from '@/components/json-status-badge'
import { SettingsMenu } from '@/components/settings-menu'
import { ToolbarButton } from '@/components/toolbar-button'
import { DropdownMenuItem } from '@/components/ui'
import { useI18n, type MessageKey } from '@/i18n'
import { formatBinding, isMacPlatform } from '@/lib/shortcuts'
import { useActiveTabKind, useEditorStore } from '@/store/editor-store'
import { useKeybindingsStore } from '@/store/keybindings-store'

const IS_MAC = isMacPlatform()

function ToolbarDivider() {
  return <div className="bg-border mx-1.5 h-4 w-px shrink-0" aria-hidden />
}

interface MenuEntry {
  icon: LucideIcon
  labelKey: MessageKey
  command: CommandId
  run: () => void
}

/**
 * Like the toolbar buttons, menu items spell their shortcut in the hover title
 * rather than drawing keycaps, so the whole toolbar reads one way.
 */
function MenuEntryItem({ entry }: { entry: MenuEntry }) {
  const { t } = useI18n()
  const binding = useKeybindingsStore((state) => state.bindingFor(entry.command))
  const Icon = entry.icon
  const label = t(entry.labelKey)
  return (
    <DropdownMenuItem onSelect={entry.run} title={binding ? `${label} (${formatBinding(binding, IS_MAC)})` : label}>
      <Icon aria-hidden />
      {label}
    </DropdownMenuItem>
  )
}

/** A toolbar button that opens a short menu of related commands — on hover too. */
function ToolbarMenu({ icon, labelKey, entries }: { icon: LucideIcon; labelKey: MessageKey; entries: MenuEntry[] }) {
  const { t } = useI18n()
  return (
    <HoverMenu trigger={<ToolbarButton icon={icon} label={t(labelKey)} menu />} className="min-w-44">
      {entries.map((entry) => (
        <MenuEntryItem key={entry.command} entry={entry} />
      ))}
    </HoverMenu>
  )
}

function DocumentToolbar() {
  const { t } = useI18n()
  const format = useEditorStore((state) => state.format)
  const minify = useEditorStore((state) => state.minify)
  const escape = useEditorStore((state) => state.escape)
  const unescape = useEditorStore((state) => state.unescape)
  const sortKeys = useEditorStore((state) => state.sortKeys)
  const foldAll = useEditorStore((state) => state.foldAll)
  const unfoldAll = useEditorStore((state) => state.unfoldAll)
  const copy = useEditorStore((state) => state.copy)

  return (
    <>
      {/* The one primary action. Everything else is quiet until hovered. */}
      <ToolbarButton
        emphasized
        icon={AlignLeft}
        label={t('action.format')}
        onClick={format}
        command="document.format"
      />
      <ToolbarButton icon={Minimize2} label={t('action.minify')} onClick={minify} command="document.minify" />

      <ToolbarMenu
        icon={ArrowDownAZ}
        labelKey="action.sortKeys"
        entries={[
          { icon: ArrowDownAZ, labelKey: 'action.sortAscending', command: 'document.sortAscending', run: () => sortKeys('asc') },
          { icon: ArrowUpAZ, labelKey: 'action.sortDescending', command: 'document.sortDescending', run: () => sortKeys('desc') },
        ]}
      />
      <ToolbarMenu
        icon={ChevronsDownUp}
        labelKey="action.foldMenu"
        entries={[
          { icon: ChevronsDownUp, labelKey: 'action.foldAll', command: 'editor.foldAll', run: foldAll },
          { icon: ChevronsUpDown, labelKey: 'action.unfoldAll', command: 'editor.unfoldAll', run: unfoldAll },
        ]}
      />
      <ToolbarMenu
        icon={Quote}
        labelKey="action.escapeMenu"
        entries={[
          { icon: Quote, labelKey: 'action.escapeLong', command: 'document.escape', run: escape },
          { icon: Braces, labelKey: 'action.unescapeLong', command: 'document.unescape', run: unescape },
        ]}
      />

      <ToolbarDivider />

      <ToolbarButton icon={Copy} label={t('action.copy')} onClick={copy} command="document.copy" />
      <ToolbarButton
        icon={Eraser}
        label={t('action.clear')}
        onClick={requestClear}
        command="document.clear"
        // Quiet until hovered: the most destructive action should not be the loudest.
        className="hover:text-destructive hover:bg-destructive/10"
      />
    </>
  )
}

function CompareToolbar() {
  const { t } = useI18n()
  const swapComparePanes = useEditorStore((state) => state.swapComparePanes)
  const promoteComparePane = useEditorStore((state) => state.promoteComparePane)

  return (
    <>
      <ToolbarButton
        icon={ArrowLeftRight}
        label={t('action.swapPanes')}
        onClick={swapComparePanes}
        command="compare.swapPanes"
      />
      <ToolbarButton icon={FileOutput} label={t('action.promoteLeft')} onClick={() => promoteComparePane('left')} />
      <ToolbarButton icon={FileInput} label={t('action.promoteRight')} onClick={() => promoteComparePane('right')} />
    </>
  )
}

/** How far a hidden edge of the toolbar row fades out. */
const EDGE_FADE = 28

/**
 * One row, always: when the labels the toolbar style asks for do not fit, the
 * row scrolls sideways (the mouse wheel scrolls it too) instead of wrapping or
 * hiding them, and whichever edge has more buttons behind it fades out — a cut
 * clean through a label read as a broken layout.
 */
function ToolbarRow({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: false, end: false })

  useEffect(() => {
    const row = ref.current
    if (!row) return
    const update = () => {
      const start = row.scrollLeft > 1
      const end = row.scrollLeft + row.clientWidth < row.scrollWidth - 1
      setEdges((current) => (current.start === start && current.end === end ? current : { start, end }))
    }
    update()
    // The row's width changes with the window; its content with the language,
    // the toolbar style and the active tab.
    const resize = new ResizeObserver(update)
    resize.observe(row)
    const mutation = new MutationObserver(update)
    mutation.observe(row, { childList: true, subtree: true, characterData: true })
    row.addEventListener('scroll', update, { passive: true })
    return () => {
      resize.disconnect()
      mutation.disconnect()
      row.removeEventListener('scroll', update)
    }
  }, [])

  const mask =
    edges.start || edges.end
      ? `linear-gradient(to right, ${edges.start ? `transparent, #000 ${EDGE_FADE}px` : '#000'}, ${
          edges.end ? `#000 calc(100% - ${EDGE_FADE}px), transparent` : '#000'
        })`
      : undefined

  return (
    <div
      ref={ref}
      className="no-scrollbar flex min-w-0 items-center gap-px overflow-x-auto"
      style={{ maskImage: mask }}
      onWheel={(event) => {
        // A plain mouse wheel only scrolls vertically; turn it sideways here.
        if (event.deltaX === 0 && event.deltaY !== 0) event.currentTarget.scrollLeft += event.deltaY
      }}
    >
      {children}
    </div>
  )
}

export function AppHeader() {
  const { t } = useI18n()
  const isCompare = useActiveTabKind() === 'compare'
  const openCompareTab = useEditorStore((state) => state.openCompareTab)

  return (
    <header className="bg-surface-raised flex min-h-10 items-center gap-3 border-b px-2.5 py-1">
      <div className="flex shrink-0 items-center gap-2">
        <img src={iconUrl} alt="" className="size-5 rounded-[5px]" aria-hidden />
        <span className="hidden text-[13px] font-semibold tracking-tight sm:inline">{t('app.name')}</span>
        <JsonStatusBadge />
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-px">
        <ToolbarRow>
          {isCompare ? <CompareToolbar /> : <DocumentToolbar />}

          <ToolbarDivider />

          {!isCompare && (
            <ToolbarButton
              icon={GitCompare}
              label={t('action.compare')}
              onClick={openCompareTab}
              command="tabs.newCompare"
            />
          )}
        </ToolbarRow>
        {/* Outside the scrolling row: settings is always one click away. */}
        <SettingsMenu />
      </div>
    </header>
  )
}
