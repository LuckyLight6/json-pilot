/**
 * Line count as the status bar reports it: an empty document has none.
 *
 * Runs on every keystroke, so it walks the newlines instead of `split`ting —
 * a multi-megabyte document would otherwise allocate an array per key press.
 */
export function countLines(text: string): number {
  if (!text) return 0
  let lines = 1
  for (let index = text.indexOf('\n'); index !== -1; index = text.indexOf('\n', index + 1)) {
    lines += 1
  }
  return lines
}
