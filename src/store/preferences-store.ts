import { create } from 'zustand'

import { readPreference, writePreference } from '@/lib/local-preference'

/** How much of a toolbar button is spelled out. */
export type ToolbarStyle = 'icon' | 'icon-text' | 'text'

/** Default first, so the menu opens on the option most users want. */
export const TOOLBAR_STYLES: ToolbarStyle[] = ['icon-text', 'icon', 'text']

const TOOLBAR_STYLE_KEY = 'toolbar-style'
const WORD_WRAP_KEY = 'word-wrap'

const BOOLEANS = ['on', 'off'] as const

interface PreferencesState {
  toolbarStyle: ToolbarStyle
  /** Applies to every editor, in every tab — it is a view preference, not per-document. */
  wordWrap: boolean
  setToolbarStyle: (style: ToolbarStyle) => void
  toggleWordWrap: () => void
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  toolbarStyle: readPreference(TOOLBAR_STYLE_KEY, TOOLBAR_STYLES, 'icon-text'),
  wordWrap: readPreference(WORD_WRAP_KEY, BOOLEANS, 'on') === 'on',

  setToolbarStyle: (style) => {
    writePreference(TOOLBAR_STYLE_KEY, style)
    set({ toolbarStyle: style })
  },
  toggleWordWrap: () =>
    set((state) => {
      const wordWrap = !state.wordWrap
      writePreference(WORD_WRAP_KEY, wordWrap ? 'on' : 'off')
      return { wordWrap }
    }),
}))

/** What a toolbar button should render under the current preference. */
export function useToolbarStyle(): { showIcon: boolean; showLabel: boolean } {
  const style = usePreferencesStore((state) => state.toolbarStyle)
  return { showIcon: style !== 'text', showLabel: style !== 'icon' }
}

export function useWordWrap(): boolean {
  return usePreferencesStore((state) => state.wordWrap)
}
