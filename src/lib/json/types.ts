/** A location in the JSON Document: object keys and array indices. */
export type JsonPath = (string | number)[]

/** A text replacement against the JSON Document source (host-agnostic). */
export interface TextEdit {
  offset: number
  length: number
  content: string
}

/** Indentation used whenever this app rewrites a JSON Document. */
export const FORMATTING_OPTIONS = {
  tabSize: 2,
  insertSpaces: true,
} as const
