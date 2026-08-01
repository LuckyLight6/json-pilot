import {
  AlignLeft,
  ArrowLeftRight,
  ChevronsDownUp,
  ChevronsUpDown,
  ClipboardPaste,
  Copy,
  FileInput,
  FileOutput,
  Minimize2,
  Scissors,
  SquareMinus,
  SquarePlus,
  TextSelect,
} from 'lucide-react'
import { useState } from 'react'

import type { CommandId } from '@/commands/registry'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui'
import { useI18n } from '@/i18n'
import type { FoldTargetKind } from '@/lib/json/fold-targets'
import { formatBinding, formatChord, isMacPlatform } from '@/lib/shortcuts'
import { useEditorStore } from '@/store/editor-store'
import { useKeybindingsStore } from '@/store/keybindings-store'

const IS_MAC = isMacPlatform()

/** A fixed hint for keys Monaco owns and we never rebind. */
function Chord({ binding }: { binding: string }) {
  return <ContextMenuShortcut>{formatChord(binding, IS_MAC)}</ContextMenuShortcut>
}

/** A hint read from the live keymap, so a rebind shows up here too. */
function CommandChord({ id }: { id: CommandId }) {
  const binding = useKeybindingsStore((state) => state.bindingFor(id))
  return binding ? <ContextMenuShortcut>{formatBinding(binding, IS_MAC)}</ContextMenuShortcut> : null
}

/** Shared by both menus; acts on whichever editor holds the caret. */
function ClipboardItems() {
  const { t } = useI18n()
  const copySelection = useEditorStore((state) => state.copySelection)
  const cutSelection = useEditorStore((state) => state.cutSelection)
  const paste = useEditorStore((state) => state.paste)
  const selectAll = useEditorStore((state) => state.selectAll)

  return (
    <>
      <ContextMenuItem onSelect={cutSelection}>
        <Scissors aria-hidden />
        {t('action.cut')}
        <Chord binding="Mod+X" />
      </ContextMenuItem>
      <ContextMenuItem onSelect={copySelection}>
        <Copy aria-hidden />
        {t('action.copySelection')}
        <Chord binding="Mod+C" />
      </ContextMenuItem>
      <ContextMenuItem onSelect={paste}>
        <ClipboardPaste aria-hidden />
        {t('action.paste')}
        <Chord binding="Mod+V" />
      </ContextMenuItem>
      <ContextMenuItem onSelect={selectAll}>
        <TextSelect aria-hidden />
        {t('action.selectAll')}
        <Chord binding="Mod+A" />
      </ContextMenuItem>
    </>
  )
}

function MenuFrame({
  onOpen,
  items,
  children,
}: {
  onOpen?: (clientX: number, clientY: number) => void
  items: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild
        onContextMenu={(event: React.MouseEvent) => onOpen?.(event.clientX, event.clientY)}
      >
        <div className="h-full">{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent>{items}</ContextMenuContent>
    </ContextMenu>
  )
}

/**
 * Replaces Monaco's built-in menu for the single-document editor (disabled via
 * `contextmenu: false`).
 *
 * Monaco still fixes the selection for us on right-click — it keeps a selection
 * you clicked inside and collapses the cursor when you click outside — so this
 * only has to decide what to show and run it.
 */
export function DocumentContextMenu({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  const [fold, setFold] = useState<{ kind: FoldTargetKind; offset: number } | null>(null)

  const format = useEditorStore((state) => state.format)
  const minify = useEditorStore((state) => state.minify)
  const foldAll = useEditorStore((state) => state.foldAll)
  const unfoldAll = useEditorStore((state) => state.unfoldAll)
  const toggleFoldAtOffset = useEditorStore((state) => state.toggleFoldAtOffset)

  const resolveFoldTarget = (clientX: number, clientY: number) => {
    const { contextOffsetAt, foldTargetAtOffset } = useEditorStore.getState()
    const offset = contextOffsetAt(clientX, clientY)
    const target = offset === null ? null : foldTargetAtOffset(offset)
    setFold(target && offset !== null ? { kind: target.kind, offset } : null)
  }

  return (
    <MenuFrame
      onOpen={resolveFoldTarget}
      items={
        <>
          {fold && (
            <>
              <ContextMenuItem onSelect={() => toggleFoldAtOffset(fold.offset)}>
                {fold.kind === 'expandable' ? <SquarePlus aria-hidden /> : <SquareMinus aria-hidden />}
                {t(fold.kind === 'expandable' ? 'action.expandNested' : 'action.collapseNested')}
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}

          <ClipboardItems />

          <ContextMenuSeparator />

          <ContextMenuItem onSelect={format}>
            <AlignLeft aria-hidden />
            {t('action.format')}
            <CommandChord id="document.format" />
          </ContextMenuItem>
          <ContextMenuItem onSelect={minify}>
            <Minimize2 aria-hidden />
            {t('action.minify')}
            <CommandChord id="document.minify" />
          </ContextMenuItem>
          <ContextMenuItem onSelect={foldAll}>
            <ChevronsDownUp aria-hidden />
            {t('action.foldAll')}
            <CommandChord id="editor.foldAll" />
          </ContextMenuItem>
          <ContextMenuItem onSelect={unfoldAll}>
            <ChevronsUpDown aria-hidden />
            {t('action.unfoldAll')}
            <CommandChord id="editor.unfoldAll" />
          </ContextMenuItem>
        </>
      }
    >
      {children}
    </MenuFrame>
  )
}

/** The comparison equivalent: clipboard plus the pane-level actions. */
export function CompareContextMenu({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  const swapComparePanes = useEditorStore((state) => state.swapComparePanes)
  const promoteComparePane = useEditorStore((state) => state.promoteComparePane)

  return (
    <MenuFrame
      items={
        <>
          <ClipboardItems />

          <ContextMenuSeparator />

          <ContextMenuItem onSelect={swapComparePanes}>
            <ArrowLeftRight aria-hidden />
            {t('action.swapPanes')}
            <CommandChord id="compare.swapPanes" />
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => promoteComparePane('left')}>
            <FileOutput aria-hidden />
            {t('action.promoteLeft')}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => promoteComparePane('right')}>
            <FileInput aria-hidden />
            {t('action.promoteRight')}
          </ContextMenuItem>
        </>
      }
    >
      {children}
    </MenuFrame>
  )
}
