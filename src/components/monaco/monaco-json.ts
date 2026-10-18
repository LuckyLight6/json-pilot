/**
 * What `monaco-editor` resolves to at runtime — aliased in `vite.config.ts`.
 *
 * The package's own entry registers ~80 Monarch grammars plus the CSS, HTML and
 * TypeScript language services, and because the `monaco` manual chunk folds
 * their lazy loaders into one file, every one of them shipped on first load.
 * JSON Pilot edits JSON only. This entry keeps the complete editor (every editor
 * contribution: find, folding, bracket matching, the F1 palette, …) and
 * registers the JSON language alone.
 *
 * Types still come from the real package, so `import … from 'monaco-editor'`
 * reads the same everywhere else in the app.
 */
import 'monaco-editor/esm/vs/language/json/monaco.contribution'

export * from 'monaco-editor/esm/vs/editor/edcore.main'
