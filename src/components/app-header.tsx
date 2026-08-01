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
} from 'lucide-react'
import { useState } from 'react'

import iconUrl from '@/assets/icon.svg'
import { JsonStatusBadge } from '@/components/json-status-badge'
import { SettingsMenu } from '@/components/settings-menu'
import { ToolbarButton } from '@/components/toolbar-button'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui'
import { useI18n } from '@/i18n'
import { useActiveTab, useEditorStore } from '@/store/editor-store'

function ToolbarDivider() {
  return <div className="bg-border mx-1.5 hidden h-4 w-px sm:block" aria-hidden />
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
  const clear = useEditorStore((state) => state.clear)
  const [isClearOpen, setClearOpen] = useState(false)

  return (
    <div className="flex flex-wrap items-center gap-px sm:justify-end">
      {/* The two workhorse actions: always labelled, filled, one click. */}
      <div className="mr-1 flex items-center gap-px">
        <ToolbarButton
          emphasized
          icon={AlignLeft}
          label={t('action.format')}
          onClick={format}
          command="document.format"
        />
        <ToolbarButton
          emphasized
          icon={Minimize2}
          label={t('action.minify')}
          onClick={minify}
          command="document.minify"
        />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ToolbarButton icon={ArrowDownAZ} label={t('action.sortKeys')} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => sortKeys('asc')}>
            <ArrowDownAZ aria-hidden />
            {t('action.sortAscending')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => sortKeys('desc')}>
            <ArrowUpAZ aria-hidden />
            {t('action.sortDescending')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolbarButton icon={ChevronsDownUp} label={t('action.foldAll')} onClick={foldAll} command="editor.foldAll" />
      <ToolbarButton icon={ChevronsUpDown} label={t('action.unfoldAll')} onClick={unfoldAll} command="editor.unfoldAll" />

      <ToolbarDivider />

      <ToolbarButton icon={Quote} label={t('action.escape')} onClick={escape} command="document.escape" />
      <ToolbarButton icon={Braces} label={t('action.unescape')} onClick={unescape} command="document.unescape" />

      <ToolbarDivider />

      <ToolbarButton icon={Copy} label={t('action.copy')} onClick={copy} command="document.copy" />
      <ToolbarButton
        icon={Eraser}
        label={t('action.clear')}
        onClick={() => setClearOpen(true)}
        command="document.clear"
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      />

      <Dialog open={isClearOpen} onOpenChange={setClearOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('confirm.clearTitle')}</DialogTitle>
            <DialogDescription>{t('confirm.clearDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              {t('confirm.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clear()
                setClearOpen(false)
              }}
            >
              {t('confirm.clearConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
      <ToolbarButton
        icon={FileOutput}
        label={t('action.promoteLeft')}
        onClick={() => promoteComparePane('left')}
      />
      <ToolbarButton
        icon={FileInput}
        label={t('action.promoteRight')}
        onClick={() => promoteComparePane('right')}
      />
    </>
  )
}

export function AppHeader() {
  const { t } = useI18n()
  const activeTab = useActiveTab()
  const openCompareTab = useEditorStore((state) => state.openCompareTab)
  const isCompare = activeTab?.kind === 'compare'

  return (
    <header className="bg-surface-raised flex flex-col gap-1 border-b px-2.5 py-1.5 sm:min-h-10 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-1">
      <div className="flex shrink-0 items-center gap-2">
        <img src={iconUrl} alt="" className="h-5 w-5" aria-hidden />
        <span className="text-[13px] font-semibold tracking-tight">{t('app.name')}</span>
        <JsonStatusBadge />
      </div>

      <div className="flex flex-wrap items-center gap-px sm:justify-end">
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
        <SettingsMenu />
      </div>
    </header>
  )
}
