import * as jsonc from 'jsonc-parser'
import { JSONPath } from 'jsonpath-plus'
import { editor, Range } from 'monaco-editor/esm/vs/editor/editor.api'
import { toast } from 'sonner'
import { create } from 'zustand'

import { JSON_CONFIG } from '@/lib/constants'

// Helper function for fold/unfold actions
const handleFoldAction = (actionId: string, successMessage: string, errorMessage: string, set: (partial: Partial<EditorState>) => void, get: () => EditorState) => {
  set({ isLoading: true })
  try {
    const { editor } = get()
    if (!editor) return

    const action = editor.getAction(actionId)
    if (action) {
      action.run()
      toast.success(successMessage)
    } else {
      toast.error(errorMessage)
    }
  } finally {
    set({ isLoading: false })
  }
}

interface EditorState {
  editor: editor.IStandaloneCodeEditor | null
  value: string
  errors: editor.IMarker[]
  isLoading: boolean
  decorations: string[] // 存储装饰器ID
  queryResult: string | null
  isQueryModalOpen: boolean
  isDiffMode: boolean
  originalValue: string
  diffValue: string
  setEditor: (editor: editor.IStandaloneCodeEditor) => void
  setValue: (value: string) => void
  setErrors: (errors: editor.IMarker[]) => void
  formatJSON: () => void
  compressJSON: () => void
  foldAll: () => void
  unfoldAll: () => void
  goToFirstError: () => void
  escapeJSON: () => void
  unescapeJSON: () => void
  copyToClipboard: () => void
  clearContent: () => void
  updateJsonDecorations: () => void
  refreshDecorations: (delay?: number) => void
  clearWidgets: () => void
  toggleJsonExpansionByPath: (path: jsonc.JSONPath) => void
  sortKeys: (direction: 'asc' | 'desc') => void
  runQuery: (query: string, type: 'jsonpath' | 'javascript') => void
  closeQueryModal: () => void
  setOriginalValue: (value: string) => void
  setDiffValue: (value: string) => void
  toggleDiffMode: (enabled: boolean) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  editor: null,
  value: '',
  errors: [],
  isLoading: false,
  decorations: [],
  queryResult: null,
  isQueryModalOpen: false,
  isDiffMode: false,
  originalValue: '',
  diffValue: '',
  setEditor: (editorInstance) => set({ editor: editorInstance }),
  setValue: (value) => {
    set({ value })
    get().refreshDecorations()
  },
  setErrors: (errors) => set({ errors }),
  formatJSON: () => {
    const { editor } = get()
    if (!editor) return

    set({ isLoading: true })
    try {
      const formatAction = editor.getAction('editor.action.formatDocument')
      if (formatAction) {
        formatAction.run()
        // 格式化完成
        // 手动触发装饰器更新，确保格式化后立即更新
        get().refreshDecorations(100)
        toast.success('JSON formatted successfully!')
      } else {
        toast.error('Formatting action is not available.')
      }
    } finally {
      set({ isLoading: false })
    }
  },
  compressJSON: () => {
    set({ isLoading: true })
    try {
      const { value } = get()
      if (!value) return

      const scanner = jsonc.createScanner(value, false)
      const removableRanges: [number, number][] = []
      let token = scanner.scan()

      while (token !== jsonc.SyntaxKind.EOF) {
        if (
          token === jsonc.SyntaxKind.Trivia ||
          token === jsonc.SyntaxKind.LineBreakTrivia ||
          token === jsonc.SyntaxKind.LineCommentTrivia ||
          token === jsonc.SyntaxKind.BlockCommentTrivia
        ) {
          removableRanges.push([scanner.getTokenOffset(), scanner.getTokenOffset() + scanner.getTokenLength()])
        }
        token = scanner.scan()
      }

      let compressedText = value
      for (let i = removableRanges.length - 1; i >= 0; i--) {
        const [start, end] = removableRanges[i]
        compressedText = compressedText.substring(0, start) + compressedText.substring(end)
      }

      set({ value: compressedText })
      // 手动触发装饰器更新
      setTimeout(() => get().refreshDecorations(), 0)
      toast.success('JSON compressed successfully!')
    } finally {
      set({ isLoading: false })
    }
  },
  foldAll: () => handleFoldAction('editor.foldAll', 'All folded successfully!', 'Fold action is not available.', set, get),
  unfoldAll: () => handleFoldAction('editor.unfoldAll', 'All unfolded successfully!', 'Unfold action is not available.', set, get),
  goToFirstError: () => {
    const { editor, errors } = get()
    if (editor && errors.length > 0) {
      const firstError = errors[0]
      editor.revealPositionInCenter({
        lineNumber: firstError.startLineNumber,
        column: firstError.startColumn,
      })
      editor.setPosition({
        lineNumber: firstError.startLineNumber,
        column: firstError.startColumn,
      })
      editor.focus()
    }
  },
  escapeJSON: () => {
    set({ isLoading: true })
    try {
      const { value } = get()
      if (!value) return

      const escapedText = JSON.stringify(value)
      set({ value: escapedText })
      // 手动触发装饰器更新
      setTimeout(() => get().refreshDecorations(), 0)
      toast.success('Content escaped successfully!')
    } finally {
      set({ isLoading: false })
    }
  },
  unescapeJSON: () => {
    set({ isLoading: true })
    try {
      const { value } = get()
      if (!value) return

      try {
        const unescapedText = JSON.parse(value)
        if (typeof unescapedText === 'string') {
          set({ value: unescapedText })
          // 手动触发装饰器更新
          setTimeout(() => get().refreshDecorations(), 0)
          toast.success('Content unescaped successfully!')
        } else {
          set({ value: JSON.stringify(unescapedText) })
          // 手动触发装饰器更新
          setTimeout(() => get().refreshDecorations(), 0)
          toast.info('Content was already valid JSON. Formatted instead.')
        }
      } catch {
        toast.error('Failed to unescape: Invalid escaped string.')
      }
    } finally {
      set({ isLoading: false })
    }
  },
  copyToClipboard: () => {
    const { value } = get()
    if (!value) {
      toast.info('There is nothing to copy.')
      return
    }

    navigator.clipboard.writeText(value).then(
      () => {
        toast.success('Content copied to clipboard!')
      },
      (err) => {
        toast.error(`Failed to copy: ${err}`)
      },
    )
  },
  clearContent: () => {
    set({ value: '' })
    // 清理所有widgets
    get().clearWidgets()
    // 手动触发装饰器更新
    setTimeout(() => get().refreshDecorations(), 0)
    toast.info('Content cleared.')
  },
  updateJsonDecorations: () => {
    const { editor, value } = get()
    if (!editor) return
    const model = editor.getModel()
    if (!model) return

    // 清理旧的widgets
    get().clearWidgets()

    const newDecorations: editor.IModelDeltaDecoration[] = []
    const root = jsonc.parseTree(value)

    if (root) {
      jsonc.visit(value, {
        // 检查字符串中包含JSON的情况
        onLiteralValue: (value: unknown, offset: number, _length: number, _startLine: number, _startCharacter: number, pathSupplier: () => jsonc.JSONPath) => {
          if (typeof value !== 'string') return

          try {
            const parsed = JSON.parse(value)
            if (typeof parsed === 'object' && parsed !== null) {
              const pathArray = pathSupplier()
              const pathString = JSON.stringify(pathArray)
              const stringNode = jsonc.findNodeAtOffset(root, offset)!
              const parent = stringNode?.parent
              
              if (parent && (parent.type === 'property' || parent.type === 'array')) {
                if (parent.type === 'property' && parent.children![0] === stringNode) {
                  return // 跳过属性名
                }

                // 在字符串开始位置（左引号）前面添加装饰器
                const startPos = model.getPositionAt(stringNode.offset)
                const decorationRange = new Range(startPos.lineNumber, startPos.column, startPos.lineNumber, startPos.column)
                const encodedPath = btoa(pathString)
                
                newDecorations.push({
                  range: decorationRange,
                  options: { 
                    beforeContentClassName: `json-value-expandable json-path-${encodedPath}`,
                    hoverMessage: { value: 'Click to expand' }
                  }
                })
              }
            }
          } catch { /* ignore */ }
        },
        // 检查所有对象（无论是否多行）
        onObjectBegin: (_offset: number, _length: number, _startLine: number, _startCharacter: number, pathSupplier: () => jsonc.JSONPath) => {
          const pathArray = pathSupplier()
          const pathString = JSON.stringify(pathArray)
          const valueNode = jsonc.findNodeAtLocation(root, pathArray)
          
          if (valueNode && valueNode.parent) {
            // 在对象开始位置（左花括号）前面添加装饰器
            const startPos = model.getPositionAt(valueNode.offset)
            const decorationRange = new Range(startPos.lineNumber, startPos.column, startPos.lineNumber, startPos.column)
            const encodedPath = btoa(pathString)

            newDecorations.push({
              range: decorationRange,
              options: { 
                beforeContentClassName: `json-value-collapsible json-path-${encodedPath}`,
                hoverMessage: { value: 'Click to collapse' }
              }
            })
          }
        },
        // 检查所有数组（无论是否多行）
        onArrayBegin: (_offset: number, _length: number, _startLine: number, _startCharacter: number, pathSupplier: () => jsonc.JSONPath) => {
          const pathArray = pathSupplier()
          const pathString = JSON.stringify(pathArray)
          const valueNode = jsonc.findNodeAtLocation(root, pathArray)
          
          if (valueNode && valueNode.parent) {
            // 在数组开始位置（左方括号）前面添加装饰器
            const startPos = model.getPositionAt(valueNode.offset)
            const decorationRange = new Range(startPos.lineNumber, startPos.column, startPos.lineNumber, startPos.column)
            const encodedPath = btoa(pathString)

            newDecorations.push({
              range: decorationRange,
              options: { 
                beforeContentClassName: `json-value-collapsible json-path-${encodedPath}`,
                hoverMessage: { value: 'Click to collapse' }
              }
            })
          }
        }
      })
    }

    // 应用新装饰器
    const decorationIds = editor.deltaDecorations([], newDecorations)
    set({ decorations: decorationIds })
  },

  refreshDecorations: (delay: number = 0) => {
    // 使用 setTimeout 确保状态更新完成后再更新装饰器
    setTimeout(() => get().updateJsonDecorations(), delay)
  },

  clearWidgets: () => {
    const { editor, decorations } = get()
    if (!editor) return

    // 移除所有装饰器
    if (decorations.length > 0) {
      editor.deltaDecorations(decorations, [])
      set({ decorations: [] })
    }
  },

  toggleJsonExpansionByPath: (pathArray: jsonc.JSONPath) => {
    const { editor, value } = get()
    if (!editor) return
    const model = editor.getModel()
    if (!model) return
    
    const root = jsonc.parseTree(value)
    if (!root) return

    const valueNode = jsonc.findNodeAtLocation(root, pathArray)
    if (!valueNode || !valueNode.parent) return
    
    const parentNode = valueNode.parent
    if (parentNode.type !== 'property' && parentNode.type !== 'array') return

    if (valueNode.type === 'string') {
      // 字符串节点：展开
      try {
        const parsed = JSON.parse(valueNode.value)
        if (typeof parsed !== 'object' || parsed === null) return

        // 使用 jsonc.modify 生成正确的编辑操作，然后用 executeEdits 应用
        const edits = jsonc.modify(
          value,
          pathArray,
          parsed,
          { formattingOptions: JSON_CONFIG.FORMATTING }
        )
        
        // 将 jsonc 的编辑操作转换为 Monaco Editor 的编辑操作
        if (edits.length > 0) {
          const monacoEdits = edits.map(edit => {
            const startPos = model.getPositionAt(edit.offset)
            const endPos = model.getPositionAt(edit.offset + edit.length)
            return {
              range: new Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
              text: edit.content
            }
          })
          
          // 使用 executeEdits 避免直接修改状态，防止闪烁
          editor.executeEdits('json-pilot-expand', monacoEdits)
        }
      } catch (error) {
        toast.error(JSON_CONFIG.MESSAGES.EXPAND_ERROR)
        console.error('Expansion error:', error)
      }
    } else if (valueNode.type === 'object' || valueNode.type === 'array') {
      // 对象/数组节点：折叠为字符串
      // 关键：我们需要重新构造原始的JSON字符串格式
      const jsonValue = jsonc.getNodeValue(valueNode)
      
      // 使用 JSON.stringify 重新生成JSON字符串，然后正确转义
      const jsonString = JSON.stringify(jsonValue)
      
      // 找到要替换的范围
      if (parentNode.type === 'property') {
        const startPos = model.getPositionAt(parentNode.offset)
        const endPos = model.getPositionAt(parentNode.offset + parentNode.length)
        const range = new Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column)
        
        // 重新构造属性，使用正确的JSON字符串格式
        const keyNode = parentNode.children![0]
        const keyText = model.getValueInRange({
          startLineNumber: model.getPositionAt(keyNode.offset).lineNumber,
          startColumn: model.getPositionAt(keyNode.offset).column,
          endLineNumber: model.getPositionAt(keyNode.offset + keyNode.length).lineNumber,
          endColumn: model.getPositionAt(keyNode.offset + keyNode.length).column
        })
        
        // 直接使用 JSON.stringify 来正确转义字符串
        const escapedJsonString = JSON.stringify(jsonString)
        const newPropertyText = `${keyText}: ${escapedJsonString}`
        editor.executeEdits('json-pilot-collapse', [{ range, text: newPropertyText }])
      } else {
        // 数组元素
        const startPos = model.getPositionAt(valueNode.offset)
        const endPos = model.getPositionAt(valueNode.offset + valueNode.length)
        const range = new Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column)
        
        // 直接使用 JSON.stringify 来正确转义字符串
        const escapedJsonString = JSON.stringify(jsonString)
        editor.executeEdits('json-pilot-collapse', [{ range, text: escapedJsonString }])
      }
    }
  },
  sortKeys: (direction: 'asc' | 'desc') => {
    set({ isLoading: true })
    try {
      const { editor, errors, value } = get()
      if (!editor) return

      if (!value.trim()) {
        toast.info('Nothing to sort.')
        return
      }

      if (errors.length > 0) {
        toast.error('Cannot sort invalid JSON. Please fix errors first.')
        get().goToFirstError()
        return
      }
      
      const parsedJson = jsonc.parse(value)

      const sortObjectRecursive = (data: unknown): unknown => {
        if (Array.isArray(data)) {
          return data.map(sortObjectRecursive)
        }
        if (data && typeof data === 'object' && data.constructor === Object) {
          const sortedKeys = Object.keys(data).sort((a, b) => {
            return direction === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
          })

          return sortedKeys.reduce((acc, key) => {
            acc[key] = sortObjectRecursive((data as Record<string, unknown>)[key])
            return acc
          }, {} as Record<string, unknown>)
        }
        return data
      }

      const sortedJson = sortObjectRecursive(parsedJson)
      
      const model = editor.getModel()
      const options = model?.getOptions()
      const indent = options?.insertSpaces ? ' '.repeat(options.tabSize) : 2

      const newText = JSON.stringify(sortedJson, null, indent)
      
      set({ value: newText })
      // 手动触发装饰器更新
      setTimeout(() => get().refreshDecorations(), 0)
      toast.success(`Keys sorted ${direction === 'asc' ? 'ascending' : 'descending'}.`)
    } catch {
      toast.error('Failed to sort keys. The content might not be valid JSON.')
    } finally {
      set({ isLoading: false })
    }
  },
  runQuery: (query: string, type: 'jsonpath' | 'javascript') => {
    set({ isLoading: true })
    try {
      const { editor, errors, value } = get()
      if (!editor) return

      if (!value.trim()) {
        toast.info('Nothing to query.')
        return
      }

      if (errors.length > 0) {
        toast.error('Cannot query invalid JSON. Please fix errors first.')
        get().goToFirstError()
        return
      }

      const data = jsonc.parse(value)
      let result: unknown

      if (type === 'jsonpath') {
        const rawResult = JSONPath({ path: query, json: data })
        if (Array.isArray(rawResult)) {
          if (rawResult.length === 0) {
            // 没有找到匹配项，显示 undefined（与JavaScript行为一致）
            result = undefined
          } else if (rawResult.length === 1) {
            result = rawResult[0]
          } else {
            result = rawResult
          }
        } else {
          result = rawResult
        }
      } else {
        let executableQuery = query.trim()
        if (executableQuery.startsWith('.') || executableQuery.startsWith('[')) {
          executableQuery = `data${executableQuery}`
        }

        const isFunctionLike = (executableQuery.includes('=>') || executableQuery.startsWith('function') || (executableQuery.startsWith('(') && executableQuery.endsWith(')')));
        
        let finalExpression;
        if (isFunctionLike) {
          finalExpression = `(${executableQuery})(data)`;
        } else {
          finalExpression = executableQuery;
        }

        const func = new Function('data', `return ${finalExpression}`)
        result = func(data)
      }

      const resultString = JSON.stringify(result, null, 2)
      set({ queryResult: resultString, isQueryModalOpen: true })
      toast.success('Query executed successfully.')

    } catch (e: unknown) {
      toast.error(`Query failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
      console.error("Query Error:", e)
    } finally {
      set({ isLoading: false })
    }
  },
  closeQueryModal: () => {
    set({ isQueryModalOpen: false, queryResult: null })
  },
  setOriginalValue: (value: string) => {
    set({ originalValue: value })
  },
  setDiffValue: (value: string) => {
    set({ diffValue: value })
  },
  toggleDiffMode: (enabled: boolean) => {
    const { value, originalValue } = get()
    if (enabled) {
      set({
        isDiffMode: true,
        originalValue: value,
        diffValue: '',
      })
    } else {
      set({
        isDiffMode: false,
        value: originalValue,
      })
    }
  },
}))
