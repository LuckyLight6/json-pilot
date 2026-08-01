import { FileJson, GitCompare, Pencil, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import {
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui'
import { useI18n } from '@/i18n'
import { formatBinding, isMacPlatform } from '@/lib/shortcuts'
import { tabTitle } from '@/lib/tabs'
import { cn } from '@/lib/utils'
import { useEditorStore, useTab, useTabIds } from '@/store/editor-store'
import { useKeybindingsStore } from '@/store/keybindings-store'

const IS_MAC = isMacPlatform()

function TabLabel({ id, renaming, onRenameDone }: {
  id: string
  renaming: boolean
  onRenameDone: () => void
}) {
  const { t } = useI18n()
  const tab = useTab(id)
  const renameTab = useEditorStore((state) => state.renameTab)
  const [draft, setDraft] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Renaming can start from a double-click or from the tab context menu.
  useEffect(() => {
    if (renaming && draft === null && tab) setDraft(tab.name ?? tabTitle(tab, t))
  }, [renaming, draft, tab, t])

  useEffect(() => {
    if (draft !== null) inputRef.current?.select()
  }, [draft])

  if (!tab) return null
  const title = tabTitle(tab, t)

  const stopRenaming = () => {
    setDraft(null)
    onRenameDone()
  }

  if (draft !== null) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={stopRenaming}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Enter') {
            renameTab(id, draft)
            stopRenaming()
          }
          if (event.key === 'Escape') stopRenaming()
        }}
        aria-label={t('tab.rename')}
        className="ring-ring w-24 rounded-sm bg-transparent px-0.5 text-xs ring-1 outline-none"
      />
    )
  }

  return (
    <span className="max-w-32 truncate" onDoubleClick={() => setDraft(tab.name ?? title)}>
      {title}
    </span>
  )
}

function TabButton({ id }: { id: string }) {
  const { t } = useI18n()
  const tab = useTab(id)
  const isActive = useEditorStore((state) => state.activeTabId === id)
  const activateTab = useEditorStore((state) => state.activateTab)
  const closeTab = useEditorStore((state) => state.closeTab)
  const closeOtherTabs = useEditorStore((state) => state.closeOtherTabs)
  const openCompareTab = useEditorStore((state) => state.openCompareTab)
  const [renaming, setRenaming] = useState(false)

  if (!tab) return null
  const Icon = tab.kind === 'compare' ? GitCompare : FileJson

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="tab"
          aria-label={tabTitle(tab, t)}
          aria-selected={isActive}
          tabIndex={isActive ? 0 : -1}
          onClick={() => activateTab(id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') activateTab(id)
          }}
          onAuxClick={(event) => {
            // Middle-click closes, the way it does in every editor and browser.
            if (event.button === 1) {
              event.preventDefault()
              closeTab(id)
            }
          }}
          className={cn(
            'group animate-in fade-in slide-in-from-left-2 relative flex shrink-0 cursor-pointer items-center gap-1.5 border-r px-2.5 text-xs transition-colors duration-200 select-none',
            isActive
              ? 'bg-background text-foreground shadow-[inset_0_1.5px_0_0_var(--primary)]'
              : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground',
          )}
        >
          <Icon className="size-3.5 shrink-0" aria-hidden />
          <TabLabel id={id} renaming={renaming} onRenameDone={() => setRenaming(false)} />
          <button
            type="button"
            title={t('tab.close')}
            aria-label={t('tab.close')}
            onClick={(event) => {
              event.stopPropagation()
              closeTab(id)
            }}
            className={cn(
              'hover:bg-muted hover:text-foreground -mr-1 rounded-[4px] p-0.5 transition-opacity',
              isActive ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
            )}
          >
            <X className="size-3" aria-hidden />
          </button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-44">
        <ContextMenuItem onSelect={() => setRenaming(true)}>
          <Pencil aria-hidden />
          {t('tab.rename')}
        </ContextMenuItem>
        {tab.kind === 'document' && (
          <ContextMenuItem
            onSelect={() => {
              // A comparison seeds from the active document; make it this one first.
              activateTab(id)
              openCompareTab()
            }}
          >
            <GitCompare aria-hidden />
            {t('tab.compareFromHere')}
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => closeTab(id)}>
          <X aria-hidden />
          {t('tab.close')}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => closeOtherTabs(id)}>
          <X aria-hidden />
          {t('tab.closeOthers')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export function TabStrip() {
  const { t } = useI18n()
  const ids = useTabIds()
  const openDocumentTab = useEditorStore((state) => state.openDocumentTab)
  const newTabBinding = useKeybindingsStore((state) => state.bindingFor('tabs.new'))

  const newTabTitle = newTabBinding
    ? `${t('tab.newDocument')} (${formatBinding(newTabBinding, IS_MAC)})`
    : t('tab.newDocument')

  return (
    <div role="tablist" aria-label={t('tab.list')} className="bg-surface-raised flex h-8 items-stretch border-b">
      <div className="no-scrollbar flex min-w-0 items-stretch overflow-x-auto">
        {ids.map((id) => (
          <TabButton key={id} id={id} />
        ))}
        {/* Rides right after the last tab, where the hand already is. Straight
            to a new document — a comparison lives on the toolbar and in the
            tab context menu. */}
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground my-1 ml-1 h-6 w-6 shrink-0 self-center rounded-md p-0"
          title={newTabTitle}
          aria-label={t('tab.newDocument')}
          onClick={() => openDocumentTab()}
        >
          <Plus aria-hidden className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
