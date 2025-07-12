// 主题相关工具函数
export function getEditorTheme(theme: string): string {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'vs-dark' : 'light'
  }
  return theme === 'dark' ? 'vs-dark' : 'light'
}

// 检查是否为暗色主题
export function isDarkTheme(theme: string): boolean {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return theme === 'dark'
}