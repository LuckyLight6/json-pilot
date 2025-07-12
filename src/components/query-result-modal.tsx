import { useEditorTheme } from '@/components'
import { MonacoEditor } from '@/components/monaco-editor'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui'
import { EDITOR_CONFIG } from '@/lib/constants'
import { useEditorStore } from '@/store/editor'

export function QueryResultModal() {
  const { isQueryModalOpen, queryResult, closeQueryModal } = useEditorStore()
  const editorTheme = useEditorTheme()

  return (
    <Dialog open={isQueryModalOpen} onOpenChange={closeQueryModal}>
      <DialogContent className="max-w-4xl w-full h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Query Result</DialogTitle>
          <DialogDescription>
            The result of your JSONPath or JavaScript query is displayed below.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 my-4">
          <MonacoEditor
            height="100%"
            language="json"
            theme={editorTheme}
            value={queryResult || ''}
            options={{
              ...EDITOR_CONFIG.MODAL_OPTIONS,
              readOnly: true,
            }}
          />
        </div>
        <DialogFooter>
          <Button onClick={closeQueryModal}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}