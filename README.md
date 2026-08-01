# JSON Pilot ✈️

> A browser JSON editor and explorer — edit, transform, query, compare, and unfold nested JSON strings.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Monaco Editor](https://img.shields.io/badge/Monaco%20Editor-007ACC?style=flat-square&logo=visual-studio-code&logoColor=white)](https://microsoft.github.io/monaco-editor/)

[Live demo](https://luckylight6.github.io/json-pilot/) · [Issues](https://github.com/LuckyLight6/json-pilot/issues)

Everything runs in the browser. No document ever leaves the page.

## Features

### Editing

- **Monaco editor** with JSON syntax highlighting, bracket matching, and code folding
- **Live validation** — the header badge shows the error count and jumps to the first one
- **Format / Minify** — re-indent with two spaces or strip all whitespace and comments (JSONC input is accepted; comments survive formatting)
- **Sort keys** recursively, ascending or descending
- **Escape / Unescape** — wrap the whole document into a JSON string literal, or unwrap one
- **Fold all / Unfold all** — Monaco line folding. A minified document is a single line with nothing to fold, and the app says so instead of doing nothing

### Nested String Fold

The headline feature: JSON documents that carry JSON *inside a string value*.

- Markers sit in the **gutter, left of the line numbers**, so they never shift the text as you edit
- A violet **⊞** marks a string holding an object or array; click it to parse the string into a real nested structure
- A violet **⊟** marks an object or array; click it to collapse it back into a string value
- They are deliberately not chevrons: Monaco draws its own grey folding chevrons in the next column, and line folding is a different operation
- Round-trips are lossless and edits are applied through Monaco, so undo/redo keeps working
- The gutter holds one marker per line, so format a minified document first to reach the nested ones
- The transform is a pure function over source text — see [`src/lib/json/nested-string-fold.ts`](src/lib/json/nested-string-fold.ts)

### Querying

- **JSONPath** via [`jsonpath-plus`](https://github.com/JSONPath-Plus/JSONPath) — `$.store.book[*].author`
- **JavaScript** expressions evaluated against `data`:
  - plain expression — `data.users.length`
  - leading accessor — `.users[0].name`
  - callback applied to the document — `d => d.users.filter(u => u.active)`
- Results open in a read-only editor with one-click copy — or one click to continue working on the result in a new tab

### Tabs and comparison

- Several documents open at once in a tab strip; `+` opens a new document directly, double-click renames, middle-click closes, and right-click offers rename / compare-from-here / close others
- A **comparison is its own tab**, seeded from the active document — opening one no longer hijacks the document you were editing
- Both diff panes are editable; **swap sides**, or send either side to a new document tab
- Tabs live in memory only; nothing is written to disk and a reload starts fresh

### Interface

- **Settings menu** (gear, top right) gathers theme / language / toolbar style — each defaulting
  to system where a system signal exists — plus the shortcuts dialog. The toolbar style applies
  to every toolbar button, including the accented Format/Minify pair
- **Keyboard shortcuts** for every action, rebindable from the shortcuts dialog (`Mod+/`)
- **Right-click menu** in both the editor and the comparison panes: cut, copy, paste, select all, plus format/minify/fold in a document and swap/promote in a comparison. Right-clicking a nested JSON string offers to expand or collapse it
- Every shortcut is spelled out in the button tooltips and menu items; the full list lives in the settings menu (or `Mod+/`)
- Status bar with line count, character count, cursor position, and a word-wrap toggle

Every choice is remembered under a `json-pilot.*` key in `localStorage`.

Defaults are single `Alt+Shift+<letter>` chords (⌥⇧ on macOS): nearly every plain
`Mod`+letter is already claimed by Monaco or the browser, and `Alt+Shift` is the shape
VS Code itself uses for Format. Press `Mod+/` for the full list, or click the keyboard
button in the header — everything is rebindable there.

## Quick start

Requires Node.js 22+ and pnpm.

```bash
pnpm install
pnpm dev
```

| Command | What it does |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` | Type-check and build to `dist/` |
| `pnpm preview` | Serve the production build |
| `pnpm test` | Run the unit tests once |
| `pnpm test:watch` | Run the unit tests in watch mode |
| `pnpm lint` | Run ESLint |

## Tech stack

| Category | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript 5.8 |
| Build | Vite 7 |
| Editor | Monaco Editor 0.52 |
| Styling | Tailwind CSS 4 |
| State | Zustand 5 |
| UI primitives | Radix UI (shadcn/ui) |
| JSON parsing | jsonc-parser |
| Path queries | jsonpath-plus |
| Tests | Vitest |

## Project structure

```
src/
├── App.tsx                     # Layout: header, query bar, workspace, status bar
├── components/
│   ├── monaco/                 # Everything that knows about Monaco
│   │   ├── setup.ts            # Worker wiring + loader config (side-effect import)
│   │   ├── options.ts          # Editor option presets
│   │   ├── code-editor.tsx     # Single-document editor
│   │   ├── diff-editor.tsx     # Comparison editor (uncontrolled panes)
│   │   └── fold-markers.ts     # Fold targets → Monaco decorations, and back
│   ├── ui/                     # shadcn/ui primitives
│   ├── app-header.tsx          # Toolbar
│   ├── editor-workspace.tsx    # Editor / diff switching + empty state
│   ├── query-bar.tsx
│   ├── query-result-dialog.tsx
│   ├── json-status-badge.tsx
│   ├── status-bar.tsx
│   ├── editor-context-menu.tsx # Right-click menus (document + comparison)
│   ├── shortcuts-dialog.tsx    # Shortcut list + rebinding
│   ├── settings-menu.tsx       # Theme / language / toolbar style / shortcuts
│   ├── tab-strip.tsx
│   └── toolbar-button.tsx
├── i18n/
│   ├── messages.ts             # Locale registry, `translate`, non-React `t`
│   ├── i18n-provider.tsx       # Context + `useI18n`
│   └── locales/                # en.ts, zh-CN.ts
├── commands/registry.ts        # Every command, its label and its default binding
├── hooks/use-keybindings.ts    # Window-capture shortcut dispatcher
├── lib/
│   ├── shortcuts.ts            # Chord parsing, matching and display (pure)
│   ├── tabs.ts                 # Tab identity, model URIs, titles (pure)
│   ├── json/                   # Pure domain logic — no React, no Monaco
│   │   ├── transform.ts        # format / minify / escape / unescape / sortKeys
│   │   ├── query.ts            # JSONPath and JavaScript queries
│   │   ├── fold-targets.ts     # Where Nested String Fold markers belong
│   │   ├── nested-string-fold.ts # Expand/collapse as an Edit List
│   │   ├── sample.ts           # Starter document
│   │   └── types.ts
│   ├── local-preference.ts     # Shared localStorage read/write for UI choices
│   └── utils.ts                # `cn`
├── store/
│   ├── editor-store.ts         # Tabs, document state, wiring the layers together
│   ├── keybindings-store.ts    # User shortcut overrides
│   └── preferences-store.ts    # Toolbar style, word wrap
└── theme/theme-provider.tsx    # Theme context + Monaco theme mapping
```

### Architecture

Three layers, in dependency order:

1. **`lib/json/`** — pure functions over JSON source text. No React, no Monaco, no toasts. This is where the unit tests live.
2. **`store/editor-store.ts`** — holds document state, calls the pure functions, and drives the Monaco instance through imperative handles kept outside the store (so attaching an editor does not re-render subscribers).
3. **`components/`** — presentation. Each component subscribes to the store with a selector rather than pulling the whole state.

Terminology used across the code lives in [CONTEXT.md](CONTEXT.md).

## Contributing

1. Fork and branch: `git checkout -b feature/amazing-feature`
2. Keep `pnpm lint`, `pnpm test`, and `pnpm build` green
3. Add tests next to the module for anything in `lib/json/`
4. Open a pull request

## License

MIT — see [LICENSE](LICENSE).
