import { useEffect } from 'react'

import { setThemeCycler } from '@/commands/registry'
import { AppHeader } from '@/components/app-header'
import { EditorWorkspace } from '@/components/editor-workspace'
import { QueryBar } from '@/components/query-bar'
import { QueryResultDialog } from '@/components/query-result-dialog'
import { ShortcutsDialog } from '@/components/shortcuts-dialog'
import { StatusBar } from '@/components/status-bar'
import { TabStrip } from '@/components/tab-strip'
import { Toaster } from '@/components/ui'
import { useKeybindings } from '@/hooks/use-keybindings'
import { I18nProvider } from '@/i18n'
import { ThemeProvider, useTheme } from '@/theme'

function Workspace() {
  const { theme, setTheme } = useTheme()

  useKeybindings()

  // The theme lives in React context, so the command registry — which runs
  // outside React — needs a way in.
  useEffect(() => setThemeCycler(() => theme, setTheme), [theme, setTheme])

  return (
    <>
      <div className="bg-background text-foreground flex h-screen flex-col overflow-hidden">
        <AppHeader />
        <TabStrip />
        <QueryBar />
        <EditorWorkspace />
        <StatusBar />
      </div>
      <QueryResultDialog />
      <ShortcutsDialog />
      <Toaster position="bottom-center" />
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <Workspace />
      </I18nProvider>
    </ThemeProvider>
  )
}
