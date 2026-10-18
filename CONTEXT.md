# JSON Pilot

A browser JSON editor and explorer: edit a document, transform it, query it, compare two versions, and fold nested stringified JSON in place.

## Language

**JSON Document**:
The JSON (or JSONC) text currently being edited, as a single string of source text.
_Avoid_: content, value (when referring to the whole buffer), buffer

**嵌套字符串折叠 (Nested String Fold)**:
Turning a string whose content is JSON object/array text into a real nested structure (expand), or turning an object/array into a JSON string value (collapse), by path within the JSON Document.
_Avoid_: fold/unfold (when meaning Monaco line folding), expand/collapse widgets, decoration click handler

**路径 (Path)**:
A location in the JSON Document as a sequence of object keys and array indices, `(string | number)[]`, matching jsonc path segments. Typed as `JsonPath`.
_Avoid_: JSONPath query string (the query feature), JSON Pointer (unless explicitly converted)

**编辑列表 (Edit List)**:
A list of text replacements (offset + length + new text) that apply Nested String Fold (or other transforms) to the JSON Document without requiring the editor host.
_Avoid_: Monaco edits, executeEdits (host-specific application of an Edit List)

**编辑器代码折叠**:
Monaco’s built-in fold/unfold of ranges in the editor UI (`foldAll` / `unfoldAll`). Unrelated to Nested String Fold.
_Avoid_: using “折叠” alone when either concept could apply

**折叠标记 (Fold Marker)**:
The clickable brand-blue ⊞ / ⊟ chip Monaco renders for a Nested String Fold target, in the glyph margin left of the line numbers. Deliberately not a chevron — Monaco's own line-folding chevrons sit in the adjacent column — and deliberately not red or orange, which read as an error. The margin holds one marker per line, so a line with several targets shows only the first. What it points at is a **折叠目标 (Fold Target)** — `{ kind, offset, path }`, produced by `collectFoldTargets`. Redraws are skipped while the target set is unchanged (Monaco tracks existing decorations through edits itself); a genuine redraw animates in, so markers never hard-blink.
_Avoid_: widget (Monaco content widgets are a different mechanism and are not used), inline decoration (markers used to reflow the line and no longer do)

**标签页 (Tab)**:
One open workspace: a **document tab** holding a single JSON Document, or a **compare tab** holding a left/right pair. Identified by a never-reused id, which also keys its Monaco text model URI (`jsonpilot://document/<id>.json`). One shared code editor serves every document tab by swapping models.
_Avoid_: window, pane (a compare tab has two panes), buffer

**命令 (Command)**:
A named, bindable action in `src/commands/registry.ts` — `{ id, labelKey, defaultBinding, run }`. Toolbar buttons, the context menu and the keyboard all invoke the same `run`.
_Avoid_: shortcut (that is the key binding, not the command), Monaco action (`editor.foldAll` and friends)

**上下文菜单 (Context Menu)**:
Our replacement for Monaco's built-in right-click menu, which is disabled with `contextmenu: false`. Two variants — document and comparison — sharing the clipboard items. Monaco still fixes the selection on right-click, so that is never re-implemented.
_Avoid_: native menu, dropdown (that is the toolbar's menu component)

**绑定 (Binding)**:
A key sequence written portably as `Alt+Shift+F` or `Mod+K Mod+0`, where `Mod` is ⌘ on macOS and Ctrl elsewhere. One or two chords; matched on `KeyboardEvent.code` (falling back to `key` when a browser leaves `code` empty) so layouts do not matter. Every command has a default, checked by `registry.test.ts`: no two collide, and no chord is both a binding and the first half of a sequence. A sequence's first chord is only `preventDefault`ed, never stopped, so Monaco's own `⌘K` chords keep working beside ours. An empty override (`''`) means the user removed the binding.
_Avoid_: Ctrl+… in a default binding (ambiguous across platforms), keycode

**偏好 (Preference)**:
A remembered UI choice — theme, language, toolbar style — persisted under a `json-pilot.*` `localStorage` key via `readPreference` / `writePreference`. Each one defaults to `system` where a system signal exists.
_Avoid_: setting, config (reserved for build and editor configuration)

**变换 (Transform)**:
A pure `(document: string) => TransformResult` rewrite of the whole JSON Document — format, minify, escape, unescape, sort keys. Each reports a typed failure reason instead of throwing or toasting. Transforms keep comments: minify always writes one line, packing every comment into a one-line block comment (the marks and escaping are documented in `lib/json/transform.ts`), and format unpacks them — only for a one-line input, so hand-written comments are never reinterpreted — so `format(minify(x))` gives a formatted `x` back exactly (less trailing commas). Minify leaves a one-line document's comments as they are, so it is idempotent; every transform settles after one application, which `transform.test.ts` checks; sort keys moves a property's comments with it and rebuilds from the source text, so number spellings and escapes survive. Only a Nested String Fold collapse drops comments — the string it writes must be strict JSON.
_Avoid_: action (reserved for Monaco editor actions such as `editor.foldAll`)

**升起面 (Raised Surface)**:
The chrome layer — header, tab strip, query bar, status bar, compare pane headers — drawn on `--surface-raised` with hairline borders. In light mode it is pure white (separation comes from the hairlines, Raycast-style); in dark mode it sits one step above `--background`, which is also the editor canvas — so the active tab, drawn on `--background`, opens straight onto the editor. Utility class `bg-surface-raised`.
_Avoid_: card (that is the dialog/popover surface), muted (a different token), grey fills for layering in light mode

**键帽 (Key Combo)**:
`KeyCombo` (`components/key-combo.tsx`) spells a live binding as one keycap per key — in the editor's context menu, the query bar, the status bar, the empty-state cheat card and the shortcuts dialog. Toolbar buttons and the menus they open spell their binding in the hover title instead, so the toolbar stays one consistent row of labels. Always derived from `useKeybindingsStore.bindingFor`, never hard-coded, so rebinds propagate.
_Avoid_: hard-coding a chord string in JSX (except the four Monaco-owned clipboard keys)

**悬停菜单 (Hover Menu)**:
`HoverMenu` (`components/hover-menu.tsx`) — a toolbar dropdown that opens when the pointer rests on it, as well as on click and from the keyboard. A pointer-opened menu never takes focus, so sweeping across the toolbar cannot steal the editor's caret; a keyboard-opened one focuses its first item as usual. Toolbar buttons and the settings button all follow the toolbar style preference.
_Avoid_: click-only dropdowns in the toolbar

**编辑器主题 (Monaco Theme)**:
`json-pilot-light` / `json-pilot-dark`, defined in `components/monaco/themes.ts`. Syntax colours come from GitHub's Primer palette; the canvas — background, gutter, line highlight, selection, cursor, scrollbar, widgets — comes from the design tokens. Monaco takes hex, so each value is the sRGB twin of an OKLCH token in `src/index.css`; change both together.
_Avoid_: `vs` / `vs-dark` (the stock themes, whose dark canvas is lighter than our chrome)

**懒加载边界 (Lazy Boundary)**:
`components/monaco/lazy.tsx` — the only door into the Monaco chunk. `CodeEditor` and `DiffEditor` render an `EditorSkeleton` until the chunk arrives, so the rest of the editor UI paints without waiting for ~810 kB of gzip. The store receives the Monaco API through `attachEditor(instance, monaco)` instead of importing it.
_Avoid_: importing `monaco-editor` at runtime anywhere else (type-only imports are fine)

**产品站 (Product Site)**:
The marketing page at `/` — `index.html` and `src/site/`. The editor lives at `/app/` (`app/index.html`). The two are separate Vite entries that share React, the UI primitives, `ThemeProvider` and `I18nProvider`, and therefore the `json-pilot.theme` / `json-pilot.locale` preferences; the site never loads Monaco. Its copy lives in `src/site/copy.ts`, apart from the editor's message catalogue. The build prerenders it (`scripts/prerender.mjs`): `src/site/prerender.tsx` renders `SiteApp` once per locale into `dist/index.html`, CSS shows the copy the head script's language picked, and `main.tsx` then replaces it with the live page. `Reveal` starts visible on a prerendered page and hides only what is still below the fold.
_Avoid_: landing (in code), homepage when meaning the editor

**服务工作线程 (Service Worker)**:
`scripts/service-worker.js`, written to `dist/sw.js` by `scripts/service-worker.mjs` with the build's editor file list, and registered by both pages through `lib/service-worker.ts` once they have loaded. Hashed build files are cache-first; pages are network-first with a cached fallback after 4 s; films are never intercepted. The product site asks it to **warm** the editor (fetch its files one at a time) four seconds after it is ready, unless the connection reports Save-Data or 2G; the intro film holds the warm-up while it plays (`film-playing` / `film-stopped` messages). A page asking for a file the warm-up is already fetching joins that download. `lib/service-worker.ts` is reached only through `import()`: a static import from both entries would give it a chunk of its own on the site's critical path.
_Avoid_: PWA / offline mode (it caches for speed; the app makes no offline promise), precache (nothing is fetched at install)

**查询结果形状 (Query Result Shape)**:
A JSONPath result's shape follows the path, never the data: a singular path (plain keys and single indices) yields the value itself or `undefined`; anything that can fan out — `*`, `..`, `[?()]`, slices, unions — yields an array, `[]` when nothing matches. Decided by `isSingularPath` in `lib/json/query.ts`, which reads the raw path so quoted keys like `$['a,b']` stay singular.
_Avoid_: unwrapping by match count (a filter flipped between object, array and `undefined` as the data changed)

**介绍片 (Intro Film)**:
The site's 24-second film, `public/media/promo-<locale>-<theme>.mp4` plus a `.webp` poster — one per locale × theme, so it matches the page around it. It is authored as a web page — `scripts/promo/` — on one Web Animations timeline cut to a 120 BPM grid, with a synthesised soundtrack built from the same cue list; `scripts/render-promo.mjs` renders it frame by frame and encodes it with WebCodecs. `?theme=light` switches its palette (the overrides at the end of `promo.css`); the timeline is identical across variants, so one soundtrack fits all four. Each comes in two **renditions**: HD (`.mp4`, 2240×1400, H.264 at a constant quantizer of 26, ~8 MB) and SD (`-sd.mp4`, 1280×800 at 27, ~1 Mb/s, ~3 MB). `src/site/film-rendition.ts` picks HD only for a film wider than 1,440 device pixels on a link a download from the site measured at 5 Mb/s or more (remembered as `json-pilot.film-link`, since later visits download nothing to measure); if HD takes over 3 s to start or stalls, `DemoVideo` carries on in SD from the same moment and remembers the link as slow. The site never autoplays it: nothing downloads until the visitor presses play, and then it plays with sound. The README's editor screenshots come from `scripts/capture-screenshots.mjs`; icons and the share card from `scripts/render-assets.mjs`, rendered from `src/assets/icon.svg`.
_Avoid_: GIF, screencast, demo recording (the film is motion graphics, not a capture of the editor)

## Conventions

- **`lib/json/` stays pure.** No React, no Monaco, no `sonner`. Everything there is unit-tested.
- **Code and comments are written in English**; user-facing copy lives only in `src/i18n/locales/` (the editor) and `src/site/copy.ts` (the product site), each with an English and a Chinese version kept in step by their types.
- **No hardcoded UI strings.** Components use `useI18n().t`; non-React code uses the module-level `t` from `@/i18n`.
- **Store subscriptions always use a selector.** `useEditorStore()` without one re-renders on every keystroke.
- **Monaco handles (editor instances, decoration collections) live outside the store**, since they are imperative and never rendered.
- **Only `components/monaco/` imports `monaco-editor` at runtime.** Everywhere else uses `import type`; see Lazy Boundary. `vite build` warns if the Monaco chunk grows past its known size, which is what a stray import of the full package looks like.
- **The site renders at build time**, under Node: its components touch `window`, `document`, `navigator` and `localStorage` only in effects and event handlers, or behind a `typeof` guard. Anything that depends on the theme is picked by the `dark` class in CSS, not by script, so the prerendered page is already right.
- **Toolbar buttons carry `data-command`**, the command id, so scripts can find them in any locale.
- **The keydown path stays allocation-light.** The dispatcher resolves chords through `useKeybindingsStore`'s pre-built `index`; never parse bindings per key press.
- **Syntax colours live in three places**: the Monaco themes, the site's `--tok-*` variables and the film's `--tok-*` in `scripts/promo/promo.css`. Change them together, keep every token at WCAG AA, then re-capture the screenshots and re-render the film.
- **No focus rings or glows.** `src/index.css` turns every outline off. Keyboard focus shows the way hover does — each control pairs its `hover:` fill with the same `focus-visible:` fill — and text fields turn their 1px border brand blue. Never add `ring-*`, `outline-*` or a halo `box-shadow` for focus.
- **Scrollbars are styled, never default**: a slim rounded thumb on a clear track for the page, and the same pill for Monaco's sliders. Demo panels on the site never scroll at all; long lines fade out instead.
