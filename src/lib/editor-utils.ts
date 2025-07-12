import * as monaco from 'monaco-editor'

import { JSON_CONFIG } from './constants'

// 需要导入MouseTargetType枚举
const MouseTargetType = monaco.editor.MouseTargetType

// 解码路径工具函数
export function decodePath(className: string): string[] | null {
  try {
    const encodedPath = className.substring(JSON_CONFIG.CSS_CLASSES.JSON_PATH_PREFIX.length)
    const pathString = atob(encodedPath)
    return JSON.parse(pathString)
  } catch {
    console.error(JSON_CONFIG.MESSAGES.DECODE_ERROR)
    return null
  }
}

// 解码 tooltip 内容
export function decodeTooltip(className: string): string | null {
  try {
    const encodedTooltip = className.substring(JSON_CONFIG.CSS_CLASSES.TOOLTIP_PREFIX.length)
    return atob(encodedTooltip)
  } catch {
    return null
  }
}

// 检查是否为内容文本目标
export function isContentTextTarget(target: monaco.editor.IMouseTarget): boolean {
  return target.type === MouseTargetType.CONTENT_TEXT && !!target.element?.className
}

// 获取带前缀的类名
export function findClassWithPrefix(classNames: string[], prefix: string): string | undefined {
  return classNames.find(c => c.startsWith(prefix))
}

// 创建防抖函数工厂
export function createDebounce() {
  let timer: number | undefined
  return (callback: () => void, delay: number) => {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
    timer = window.setTimeout(() => {
      callback()
      timer = undefined
    }, delay)
  }
}

// 计算工具提示位置
export function calculateTooltipPosition(posx: number, posy: number) {
  return {
    top: posy + JSON_CONFIG.TOOLTIP_OFFSET.TOP,
    left: posx + JSON_CONFIG.TOOLTIP_OFFSET.LEFT,
  }
}