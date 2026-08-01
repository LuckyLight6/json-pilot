import { create } from 'zustand'

import { COMMANDS, type CommandId } from '@/commands/registry'
import { parseBinding } from '@/lib/shortcuts'

const STORAGE_KEY = 'json-pilot.keybindings'

type BindingOverrides = Partial<Record<CommandId, string>>

interface KeybindingsState {
  /** Only what the user changed; defaults stay in the command registry. */
  overrides: BindingOverrides
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
        ([id, binding]) => known.has(id as CommandId) && typeof binding === 'string' && parseBinding(binding),
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

export const useKeybindingsStore = create<KeybindingsState>((set, get) => ({
  overrides: readOverrides(),

  bindingFor: (id) =>
    get().overrides[id] ?? COMMANDS.find((command) => command.id === id)?.defaultBinding ?? '',

  commandUsing: (binding, except) => {
    const { bindingFor } = get()
    const match = COMMANDS.find((command) => command.id !== except && bindingFor(command.id) === binding)
    return match?.id ?? null
  },

  rebind: (id, binding) =>
    set((state) => {
      const overrides = { ...state.overrides, [id]: binding }
      writeOverrides(overrides)
      return { overrides }
    }),

  reset: (id) =>
    set((state) => {
      const overrides = { ...state.overrides }
      delete overrides[id]
      writeOverrides(overrides)
      return { overrides }
    }),

  resetAll: () => {
    writeOverrides({})
    set({ overrides: {} })
  },
}))
