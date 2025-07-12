import { PlayIcon } from 'lucide-react'
import React, { useState } from 'react'

import { Button, Input, ToggleGroup, ToggleGroupItem } from '@/components/ui'
import { useEditorStore } from '@/store/editor'

export function QueryBar() {
  const [query, setQuery] = useState('')
  const [queryType, setQueryType] = useState<'jsonpath' | 'javascript'>('jsonpath')
  const runQuery = useEditorStore((state) => state.runQuery)
  const isLoading = useEditorStore((state) => state.isLoading)

  const handleRunQuery = () => {
    if (query) runQuery(query, queryType)
  }

  const handleQueryTypeChange = (value: 'jsonpath' | 'javascript') => {
    setQueryType(value)
  }

  return (
    <div className="flex items-center gap-2 p-2 border-b bg-background">
      <ToggleGroup type="single" value={queryType} onValueChange={handleQueryTypeChange} aria-label="Query Type">
        <ToggleGroupItem value="jsonpath" aria-label="JSONPath">
          JSONPath
        </ToggleGroupItem>
        <ToggleGroupItem value="javascript" aria-label="JavaScript">
          JavaScript
        </ToggleGroupItem>
      </ToggleGroup>
      <Input
        placeholder={queryType === 'jsonpath' ? 'e.g., $.store.book[*].author' : 'e.g., .filter(i => i.active) or data.map(i => i.name)'}
        value={query}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleRunQuery()
          }
        }}
        className="flex-1 font-mono"
      />
      <Button onClick={handleRunQuery} disabled={isLoading}>
        <PlayIcon className="mr-2 h-4 w-4" />
        Run Query
      </Button>
    </div>
  )
}