/**
 * What `monaco-editor` resolves to at runtime — aliased in `vite.config.ts`.
 *
 * The package's own entry registers ~80 Monarch grammars plus the CSS, HTML and
 * TypeScript language services, and because the `monaco` manual chunk folds
 * their lazy loaders into one file, every one of them shipped on first load.
 * JSON Pilot edits JSON only, so this entry registers the JSON language alone.
 *
 * It also leaves out the editor contributions that only serve language
 * features JSON does not have — rename, go to definition and references,
 * code lens, code actions, inlay hints, semantic tokens, linked editing,
 * signature help, inline (ghost text) completions — or that this editor turns
 * off. Each would only add a palette command that never does anything; together
 * they are about 50 kB of gzip. Everything else is `edcore.main` as shipped:
 * find, folding, bracket matching, suggest, hover, sticky scroll, the F1
 * palette, go to line and symbol, ….
 *
 * Types still come from the real package, so `import … from 'monaco-editor'`
 * reads the same everywhere else in the app.
 */
import 'monaco-editor/esm/vs/editor/browser/coreCommands.js'
import 'monaco-editor/esm/vs/editor/browser/widget/codeEditor/codeEditorWidget.js'
import 'monaco-editor/esm/vs/editor/browser/widget/diffEditor/diffEditor.contribution.js'
import 'monaco-editor/esm/vs/editor/contrib/anchorSelect/browser/anchorSelect.js'
import 'monaco-editor/esm/vs/editor/contrib/bracketMatching/browser/bracketMatching.js'
import 'monaco-editor/esm/vs/editor/contrib/caretOperations/browser/caretOperations.js'
import 'monaco-editor/esm/vs/editor/contrib/caretOperations/browser/transpose.js'
import 'monaco-editor/esm/vs/editor/contrib/clipboard/browser/clipboard.js'
import 'monaco-editor/esm/vs/editor/contrib/colorPicker/browser/colorContributions.js'
import 'monaco-editor/esm/vs/editor/contrib/colorPicker/browser/standaloneColorPickerActions.js'
import 'monaco-editor/esm/vs/editor/contrib/comment/browser/comment.js'
import 'monaco-editor/esm/vs/editor/contrib/contextmenu/browser/contextmenu.js'
import 'monaco-editor/esm/vs/editor/contrib/cursorUndo/browser/cursorUndo.js'
import 'monaco-editor/esm/vs/editor/contrib/dnd/browser/dnd.js'
import 'monaco-editor/esm/vs/editor/contrib/dropOrPasteInto/browser/copyPasteContribution.js'
import 'monaco-editor/esm/vs/editor/contrib/dropOrPasteInto/browser/dropIntoEditorContribution.js'
import 'monaco-editor/esm/vs/editor/contrib/find/browser/findController.js'
import 'monaco-editor/esm/vs/editor/contrib/folding/browser/folding.js'
import 'monaco-editor/esm/vs/editor/contrib/fontZoom/browser/fontZoom.js'
import 'monaco-editor/esm/vs/editor/contrib/format/browser/formatActions.js'
import 'monaco-editor/esm/vs/editor/contrib/documentSymbols/browser/documentSymbols.js'
import 'monaco-editor/esm/vs/editor/contrib/inlineProgress/browser/inlineProgress.js'
import 'monaco-editor/esm/vs/editor/contrib/gotoError/browser/gotoError.js'
import 'monaco-editor/esm/vs/editor/contrib/hover/browser/hoverContribution.js'
import 'monaco-editor/esm/vs/editor/contrib/indentation/browser/indentation.js'
import 'monaco-editor/esm/vs/editor/contrib/inPlaceReplace/browser/inPlaceReplace.js'
import 'monaco-editor/esm/vs/editor/contrib/lineSelection/browser/lineSelection.js'
import 'monaco-editor/esm/vs/editor/contrib/linesOperations/browser/linesOperations.js'
import 'monaco-editor/esm/vs/editor/contrib/links/browser/links.js'
import 'monaco-editor/esm/vs/editor/contrib/longLinesHelper/browser/longLinesHelper.js'
import 'monaco-editor/esm/vs/editor/contrib/multicursor/browser/multicursor.js'
import 'monaco-editor/esm/vs/editor/contrib/placeholderText/browser/placeholderText.contribution.js'
import 'monaco-editor/esm/vs/editor/contrib/smartSelect/browser/smartSelect.js'
import 'monaco-editor/esm/vs/editor/contrib/snippet/browser/snippetController2.js'
import 'monaco-editor/esm/vs/editor/contrib/stickyScroll/browser/stickyScrollContribution.js'
import 'monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController.js'
import 'monaco-editor/esm/vs/editor/contrib/tokenization/browser/tokenization.js'
import 'monaco-editor/esm/vs/editor/contrib/toggleTabFocusMode/browser/toggleTabFocusMode.js'
import 'monaco-editor/esm/vs/editor/contrib/unicodeHighlighter/browser/unicodeHighlighter.js'
import 'monaco-editor/esm/vs/editor/contrib/unusualLineTerminators/browser/unusualLineTerminators.js'
import 'monaco-editor/esm/vs/editor/contrib/wordHighlighter/browser/wordHighlighter.js'
import 'monaco-editor/esm/vs/editor/contrib/wordOperations/browser/wordOperations.js'
import 'monaco-editor/esm/vs/editor/contrib/wordPartOperations/browser/wordPartOperations.js'
import 'monaco-editor/esm/vs/editor/contrib/readOnlyMessage/browser/contribution.js'
import 'monaco-editor/esm/vs/editor/contrib/diffEditorBreadcrumbs/browser/contribution.js'
import 'monaco-editor/esm/vs/editor/common/standaloneStrings.js'
import 'monaco-editor/esm/vs/base/browser/ui/codicons/codiconStyles.js'
import 'monaco-editor/esm/vs/editor/standalone/browser/iPadShowKeyboard/iPadShowKeyboard.js'
import 'monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneHelpQuickAccess.js'
import 'monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneGotoLineQuickAccess.js'
import 'monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneGotoSymbolQuickAccess.js'
import 'monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneCommandsQuickAccess.js'
import 'monaco-editor/esm/vs/editor/standalone/browser/toggleHighContrast/toggleHighContrast.js'
import 'monaco-editor/esm/vs/language/json/monaco.contribution'

export * from 'monaco-editor/esm/vs/editor/editor.api'
