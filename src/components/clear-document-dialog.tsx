import { useEffect, useRef, useState } from 'react'

import { setClearRequester } from '@/commands/registry'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui'
import { useI18n } from '@/i18n'
import { isMacPlatform } from '@/lib/shortcuts'
import { useEditorStore } from '@/store/editor-store'

const UNDO_KEYS = isMacPlatform() ? '⌘Z' : 'Ctrl+Z'

/**
 * The one way to clear a document: the toolbar button and the (rebindable)
 * keyboard command both ask here first, so a stray key press cannot wipe it.
 * Clearing is an ordinary editor edit, so undo brings the document back; the
 * editor keeps focus afterwards so that undo is one key press away.
 */
export function ClearDocumentDialog() {
  const { t } = useI18n()
  const [isOpen, setOpen] = useState(false)
  const clear = useEditorStore((state) => state.clear)
  const focusEditor = useEditorStore((state) => state.focusEditor)
  const cleared = useRef(false)

  useEffect(
    () =>
      setClearRequester(() => {
        cleared.current = false
        setOpen(true)
      }),
    [],
  )

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        // After clearing, focus belongs in the editor (where undo works), not on
        // the toolbar button that opened this. Only now — while the dialog is
        // open, its focus trap would pull focus straight back.
        onCloseAutoFocus={(event) => {
          if (!cleared.current) return
          event.preventDefault()
          focusEditor()
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('confirm.clearTitle')}</DialogTitle>
          <DialogDescription>{t('confirm.clearDescription', { undo: UNDO_KEYS })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('confirm.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              cleared.current = true
              clear()
              setOpen(false)
            }}
          >
            {t('confirm.clearConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
