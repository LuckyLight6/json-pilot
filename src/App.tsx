import { Loader2 } from "lucide-react"
import * as monaco from "monaco-editor"
import React, { useState } from "react"

import { 
  ThemeProvider, 
  useEditorTheme, 
  ModeToggle, 
  JsonStatusIndicator, 
  QueryBar, 
  QueryResultModal 
} from "@/components"
import { MonacoEditor, MonacoDiffEditor } from '@/components/monaco-editor'
import { 
  Button, 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  Toaster 
} from "@/components/ui"
import { EDITOR_CONFIG } from "@/lib/constants"
import { 
  decodePath, 
  decodeTooltip, 
  isContentTextTarget, 
  findClassWithPrefix,
  calculateTooltipPosition 
} from "@/lib/editor-utils"
import { useEditorStore } from "@/store/editor"

// A reusable button component that handles its own loading state.
const ActionButton = React.memo(({ children, onClick, ...props }: React.ComponentProps<typeof Button>) => {
  const isLoading = useEditorStore(state => state.isLoading)
  return (
    <Button onClick={onClick} disabled={isLoading} {...props}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  )
})

const AppHeader = React.memo(() => {
  const {
    formatJSON,
    compressJSON,
    foldAll,
    unfoldAll,
    escapeJSON,
    unescapeJSON,
    copyToClipboard,
    clearContent,
    sortKeys,
    isDiffMode,
    toggleDiffMode,
  } = useEditorStore()

  return (
    <header className="flex items-center justify-between p-2 border-b">
      <div className="flex items-center gap-1">
        <img src="./icon.svg" alt="JSON Pilot" className="w-8 h-8" />
        <h1 className="text-lg font-bold">JSON Pilot</h1>
        <JsonStatusIndicator />
      </div>
      <div className="flex items-center gap-2">
        <ActionButton onClick={formatJSON}>Format</ActionButton>
        <ActionButton onClick={compressJSON} variant="outline">Compress</ActionButton>
        <ActionButton onClick={() => toggleDiffMode(!isDiffMode)} variant="outline">
          {isDiffMode ? 'Exit Compare' : 'Compare'}
        </ActionButton>
        <ActionButton onClick={escapeJSON} variant="outline">Escape</ActionButton>
        <ActionButton onClick={unescapeJSON} variant="outline">Unescape</ActionButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Sort Keys</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => sortKeys('asc')}>Ascending (A-Z)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => sortKeys('desc')}>Descending (Z-A)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ActionButton onClick={copyToClipboard} variant="outline">Copy</ActionButton>
        <ActionButton onClick={clearContent} variant="destructive">Clear</ActionButton>
        <ActionButton onClick={foldAll} variant="outline">Fold All</ActionButton>
        <ActionButton onClick={unfoldAll} variant="outline">Unfold All</ActionButton>
        <ModeToggle />
      </div>
    </header>
  )
})

function EditorArea() {
  const editorTheme = useEditorTheme()
  const {
    setEditor,
    setErrors,
    updateJsonDecorations,
    toggleJsonExpansionByPath,
    isDiffMode,
    originalValue,
    diffValue,
    setOriginalValue,
    setDiffValue,
    value,
    setValue,
  } = useEditorStore()
  const [tooltip, setTooltip] = useState<{ content: string; top: number; left: number } | null>(null)

  const handleEditorDidMount = (editorInstance: monaco.editor.IStandaloneCodeEditor) => {
    setEditor(editorInstance)

    // 移除 onDidChangeModelContent 中的装饰器更新，避免与 onChange->setValue 冲突
    // 装饰器更新现在统一通过 setValue 处理

    editorInstance.onMouseDown((event: monaco.editor.IEditorMouseEvent) => {
      const target = event.target
      if (isContentTextTarget(target)) {
        const classNames = target.element!.className.split(' ')
        const pathClassName = findClassWithPrefix(classNames, 'json-path-')
        if (pathClassName) {
          const pathArray = decodePath(pathClassName)
          if (pathArray) {
            toggleJsonExpansionByPath(pathArray)
          }
        }
      }
    })

    editorInstance.onMouseMove((event: monaco.editor.IEditorMouseEvent) => {
      const target = event.target
      if (isContentTextTarget(target)) {
        const classNames = target.element!.className.split(' ')
        const tooltipClassName = findClassWithPrefix(classNames, 'tooltip-')
        if (tooltipClassName) {
          const content = decodeTooltip(tooltipClassName)
          if (content) {
            const { posx, posy } = event.event
            setTooltip({
              content,
              ...calculateTooltipPosition(posx, posy),
            })
          }
          return
        }
      }
      setTooltip(null)
    })

    editorInstance.onMouseLeave(() => {
      setTooltip(null)
    })

    // Initial check
    updateJsonDecorations()
    editorInstance.focus()
  }

  return (
    <main className="flex-1 relative overflow-hidden">
      {tooltip && (
        <div
          className="custom-tooltip"
          style={{
            top: tooltip.top,
            left: tooltip.left,
          }}
        >
          {tooltip.content}
        </div>
      )}
      <div style={{ display: isDiffMode ? 'none' : 'block', height: '100%' }}>
        <MonacoEditor
          height="100%"
          language="json"
          value={value}
          theme={editorTheme}
          onMount={handleEditorDidMount}
          onChange={(newValue) => setValue(newValue || '')}
          onValidate={setErrors}
          options={EDITOR_CONFIG.EDITOR_OPTIONS}
        />
      </div>
      <div style={{ display: isDiffMode ? 'block' : 'none', height: '100%' }}>
        <MonacoDiffEditor
          height="100%"
          language="json"
          original={originalValue}
          modified={diffValue}
          onMount={(editorInstance) => {
            const originalEditor = editorInstance.getOriginalEditor()
            const modifiedEditor = editorInstance.getModifiedEditor()

            originalEditor.onDidChangeModelContent(() => {
              setOriginalValue(originalEditor.getValue())
            })
            modifiedEditor.onDidChangeModelContent(() => {
              setDiffValue(modifiedEditor.getValue())
            })
          }}
          theme={editorTheme}
          options={EDITOR_CONFIG.DIFF_EDITOR_OPTIONS}
        />
      </div>
    </main>
  )
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div className="relative flex flex-col h-screen w-screen bg-background">
        <AppHeader />
        <QueryBar />
        <EditorArea />
        <Toaster />
        <QueryResultModal />
      </div>
    </ThemeProvider>
  )
}

export default App