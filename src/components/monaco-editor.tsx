import Editor, { DiffEditor, loader } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import * as monaco from 'monaco-editor'
// Worker imports for JSON support and basic editor functionality
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import React from 'react'

// Configure MonacoEnvironment for JSON and basic editor support only
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker()
    }
    return new editorWorker()
  },
}

// Configure loader to use local monaco instance instead of CDN
loader.config({ monaco })

interface MonacoEditorProps {
  value: string
  onChange?: (value: string | undefined) => void
  onMount?: (editor: editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => void
  onValidate?: (markers: editor.IMarker[]) => void
  theme?: string
  options?: editor.IStandaloneEditorConstructionOptions
  height?: string | number
  language?: string
  loading?: React.ReactNode
}

export function MonacoEditor({
  value,
  onChange,
  onMount,
  onValidate,
  theme = 'vs-dark',
  options = {},
  height = '100%',
  language = 'json',
  loading = <div>Loading Editor...</div>
}: MonacoEditorProps) {
  const handleMount = (editor: editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
    // 处理验证错误
    if (onValidate) {
      const model = editor.getModel()
      if (model) {
        monaco.editor.onDidChangeMarkers(() => {
          const markers = monaco.editor.getModelMarkers({ resource: model.uri })
          onValidate(markers)
        })
      }
    }
    
    // 调用用户的 onMount
    onMount?.(editor, monaco)
  }

  return (
    <Editor
      height={height}
      language={language}
      value={value}
      theme={theme}
      loading={loading}
      options={{
        // 最小化配置 - 只启用必要功能
        automaticLayout: true,
        minimap: { enabled: false }, // 禁用小地图减少内存使用
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineNumbers: 'on',
        roundedSelection: false,
        scrollbar: {
          alwaysConsumeMouseWheel: false,
          vertical: 'visible',
          horizontal: 'visible'
        },
        // 只启用基本编辑功能
        wordWrap: 'on',
        folding: true,
        matchBrackets: 'always',
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always',
        autoIndent: 'full',
        formatOnType: true,
        formatOnPaste: true,
        // 禁用高级功能以减少包大小和内存使用
        suggest: { 
          showWords: false,
          showSnippets: false,
          showClasses: false,
          showFunctions: false,
          showConstructors: false,
          showFields: false,
          showVariables: false,
          showModules: false,
          showProperties: false,
          showUnits: false,
          showValues: false,
          showEnums: false,
          showKeywords: false,
          showColors: false,
          showFiles: false,
          showReferences: false,
          showFolders: false,
          showTypeParameters: false,
          showIssues: false,
          showUsers: false
        },
        quickSuggestions: false,
        parameterHints: { enabled: false },
        occurrencesHighlight: 'off',
        selectionHighlight: false,
        codeLens: false,
        definitionLinkOpensInPeek: false,
        gotoLocation: { multiple: 'goto' },
        ...options
      }}
      onChange={onChange}
      onMount={handleMount}
    />
  )
}

interface MonacoDiffEditorProps {
  original: string
  modified: string
  onMount?: (editor: editor.IStandaloneDiffEditor, monaco: typeof import('monaco-editor')) => void
  theme?: string
  options?: editor.IDiffEditorConstructionOptions
  height?: string | number
  language?: string
  loading?: React.ReactNode
}

export function MonacoDiffEditor({
  original,
  modified,
  onMount,
  theme = 'vs-dark',
  options = {},
  height = '100%',
  language = 'json',
  loading = <div>Loading Diff Editor...</div>
}: MonacoDiffEditorProps) {
  return (
    <DiffEditor
      height={height}
      language={language}
      original={original}
      modified={modified}
      theme={theme}
      loading={loading}
      options={{
        automaticLayout: true,
        // 最小化 diff 功能
        enableSplitViewResizing: true,
        renderSideBySide: true,
        ignoreTrimWhitespace: false,
        renderIndicators: true,
        // 禁用不必要的功能
        originalEditable: false,
        ...options
      }}
      onMount={onMount}
    />
  )
}