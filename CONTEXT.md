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
The clickable violet ⊞ / ⊟ chip Monaco renders for a Nested String Fold target, in the glyph margin left of the line numbers. Deliberately not a chevron — Monaco's own line-folding chevrons sit in the adjacent column. The margin holds one marker per line, so a line with several targets shows only the first. What it points at is a **折叠目标 (Fold Target)** — `{ kind, offset, path }`, produced by `collectFoldTargets`. Redraws are skipped while the target set is unchanged (Monaco tracks existing decorations through edits itself); a genuine redraw animates in, so markers never hard-blink.
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
A key sequence written portably as `Mod+Shift+F` or `Mod+K M`, where `Mod` is ⌘ on macOS and Ctrl elsewhere. One or two chords; matched on `KeyboardEvent.code` so layouts do not matter.
_Avoid_: Ctrl+… in a default binding (ambiguous across platforms), keycode

**偏好 (Preference)**:
A remembered UI choice — theme, language, toolbar style — persisted under a `json-pilot.*` `localStorage` key via `readPreference` / `writePreference`. Each one defaults to `system` where a system signal exists.
_Avoid_: setting, config (reserved for build and editor configuration)

**变换 (Transform)**:
A pure `(document: string) => TransformResult` rewrite of the whole JSON Document — format, minify, escape, unescape, sort keys. Each reports a typed failure reason instead of throwing or toasting.
_Avoid_: action (reserved for Monaco editor actions such as `editor.foldAll`)

**升起面 (Raised Surface)**:
The chrome layer — header, tab strip, query bar, status bar, compare pane headers — drawn on `--surface-raised` with hairline borders. In light mode it is pure white (separation comes from the hairlines, Raycast-style); in dark mode it sits one step above `--background`. Utility class `bg-surface-raised`.
_Avoid_: card (that is the dialog/popover surface), muted (a different token), grey fills for layering in light mode

**键帽提示 (Kbd Hint)**:
The `.kbd-hint` keycap chip that spells a live binding inline — in toolbar buttons (labels-on style, lg+), menus, the query bar and the empty-state cheat card. Always derived from `useKeybindingsStore.bindingFor`, never hard-coded, so rebinds propagate.
_Avoid_: hard-coding a chord string in JSX (except the four Monaco-owned clipboard keys)

## Conventions

- **`lib/json/` stays pure.** No React, no Monaco, no `sonner`. Everything there is unit-tested.
- **Code and comments are written in English**; user-facing copy lives only in `src/i18n/locales/`.
- **No hardcoded UI strings.** Components use `useI18n().t`; non-React code uses the module-level `t` from `@/i18n`.
- **Store subscriptions always use a selector.** `useEditorStore()` without one re-renders on every keystroke.
- **Monaco handles (editor instances, decoration collections) live outside the store**, since they are imperative and never rendered.
