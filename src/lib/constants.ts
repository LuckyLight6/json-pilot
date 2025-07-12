// 编辑器配置常量
export const EDITOR_CONFIG = {
  DEBOUNCE_DELAY: 500,
  UPDATE_DECORATION_DELAY: 50,
  EDITOR_OPTIONS: {
    automaticLayout: true,
    wordWrap: 'off' as const,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    glyphMargin: false,
    lineNumbersMinChars: 3,
    folding: true,
    readOnly: false,
    scrollbar: {
      vertical: 'auto' as const,
      horizontal: 'auto' as const,
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
  },
  DIFF_EDITOR_OPTIONS: {
    originalEditable: true,
    automaticLayout: true,
    minimap: { enabled: false },
    renderOverviewRuler: false,
    diffWordWrap: 'off' as const,
    scrollbar: {
      vertical: 'auto' as const,
      horizontal: 'auto' as const,
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
  },
  MODAL_OPTIONS: {
    readOnly: true,
    automaticLayout: true,
    wordWrap: 'on' as const,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    glyphMargin: true,
  },
} as const

// JSON 相关常量
export const JSON_CONFIG = {
  FORMATTING: {
    tabSize: 2,
    insertSpaces: true,
  },
  CSS_CLASSES: {
    JSON_PATH_PREFIX: 'json-path-',
    TOOLTIP_PREFIX: 'tooltip-',
  },
  MESSAGES: {
    DECODE_ERROR: 'Failed to decode path from class name',
    EXPAND_ERROR: 'Failed to expand JSON: The string is not valid JSON.',
  },
  TOOLTIP_OFFSET: {
    TOP: 15,
    LEFT: 10,
  },
} as const

// 应用常量
export const APP_CONFIG = {
  THEME: {
    STORAGE_KEY: 'vite-ui-theme',
    DEFAULT: 'dark' as const,
  },
} as const