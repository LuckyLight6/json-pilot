import { create } from 'zustand'

import { COMMANDS, type CommandId } from '@/commands/registry'
import { buildBindingIndex, parseBinding, type BindingIndex } from '@/lib/shortcuts'

const STORAGE_KEY = 'json-pilot.keybindings'

type BindingOverrides = Partial<Record<CommandId, string>>

const DEFAULT_BINDINGS = new Map(COMMANDS.map((command) => [command.id, command.defaultBinding]))

/** The effective keymap, in registry order so the first command wins a clash. */
function indexKeymap(overrides: BindingOverrides): BindingIndex<CommandId> {
  return buildBindingIndex(COMMANDS.map((command) => [command.id, overrides[command.id] ?? command.defaultBinding] as const))
}

interface KeybindingsState {
  /** Only what the user changed; defaults stay in the command registry. */
  overrides: BindingOverrides
  /** The effective keymap pre-parsed for the dispatcher; rebuilt on every change. */
  index: BindingIndex<CommandId>
  /**
   * True while the shortcuts dialog is recording a new binding. The global
   * dispatcher is registered first and would otherwise run whatever command
   * the keys being recorded are currently bound to.
   */
  recording: boolean
  setRecording: (recording: boolean) => void
  bindingFor: (id: CommandId) => string
  /** The command a binding would trigger, ignoring `except` — for clash checks. */
  commandUsing: (binding: string, except?: CommandId) => CommandId | null
  rebind: (id: CommandId, binding: string) => void
  reset: (id: CommandId) => void
  resetAll: () => void
}

function readOverrides(): BindingOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}

    // Drop anything unparseable or pointing at a command that no longer exists,
    // so a stale file cannot leave a command permanently unbound.
    const known = new Set(COMMANDS.map((command) => command.id))
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        // An empty string is a deliberately removed shortcut, not a stale one.
        ([id, binding]) =>
          known.has(id as CommandId) && typeof binding === 'string' && (binding === '' || parseBinding(binding)),
      ),
    ) as BindingOverrides
  } catch {
    return {}
  }
}

function writeOverrides(overrides: BindingOverrides): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    /* preference simply will not survive a reload */
  }
}

const initialOverrides = readOverrides()

export const useKeybindingsStore = create<KeybindingsState>((set, get) => {
  const apply = (overrides: BindingOverrides) => {
    writeOverrides(overrides)
    set({ overrides, index: indexKeymap(overrides) })
  }

  return {
    overrides: initialOverrides,
    index: indexKeymap(initialOverrides),
    recording: false,
    setRecording: (recording) => set({ recording }),

    bindingFor: (id) => get().overrides[id] ?? DEFAULT_BINDINGS.get(id) ?? '',

    commandUsing: (binding, except) => {
      const { bindingFor } = get()
      const match = COMMANDS.find((command) => command.id !== except && bindingFor(command.id) === binding)
      return match?.id ?? null
    },

    rebind: (id, binding) => apply({ ...get().overrides, [id]: binding }),

    reset: (id) => {
      const overrides = { ...get().overrides }
      delete overrides[id]
      apply(overrides)
    },

    resetAll: () => apply({}),
  }
})
