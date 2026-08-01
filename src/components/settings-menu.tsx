import { Check, Keyboard, Settings2 } from 'lucide-react'

import { COMMANDS_BY_ID } from '@/commands/registry'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui'
import { LOCALE_PREFERENCES, useI18n } from '@/i18n'
import { formatBinding, isMacPlatform } from '@/lib/shortcuts'
import { useKeybindingsStore } from '@/store/keybindings-store'
import { TOOLBAR_STYLES, usePreferencesStore } from '@/store/preferences-store'
import { THEMES, useTheme } from '@/theme'

const IS_MAC = isMacPlatform()

function CheckMark({ active }: { active: boolean }) {
  return <Check className={active ? 'opacity-100' : 'opacity-0'} aria-hidden />
}

/**
 * One home for every appearance choice. Four separate header buttons (shortcuts,
 * toolbar style, language, theme) said "toolbar" more than "app"; a single menu
 * keeps the header quiet and gives each option a labelled section.
 */
export function SettingsMenu() {
  const { t, preference, setPreference } = useI18n()
  const { theme, setTheme } = useTheme()
  const toolbarStyle = usePreferencesStore((state) => state.toolbarStyle)
  const setToolbarStyle = usePreferencesStore((state) => state.setToolbarStyle)
  const shortcutsBinding = useKeybindingsStore((state) => state.bindingFor('app.showShortcuts'))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground size-7"
          title={t('settings.title')}
          aria-label={t('settings.title')}
        >
          <Settings2 className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel>{t('theme.toggle')}</DropdownMenuLabel>
        {THEMES.map((option) => (
          <DropdownMenuItem key={option} onClick={() => setTheme(option)}>
            <CheckMark active={theme === option} />
            {t(`theme.${option}`)}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuLabel>{t('language.toggle')}</DropdownMenuLabel>
        {LOCALE_PREFERENCES.map((option) => (
          <DropdownMenuItem key={option} onClick={() => setPreference(option)}>
            <CheckMark active={preference === option} />
            {t(`language.${option}`)}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuLabel>{t('toolbar.style')}</DropdownMenuLabel>
        {TOOLBAR_STYLES.map((option) => (
          <DropdownMenuItem key={option} onClick={() => setToolbarStyle(option)}>
            <CheckMark active={toolbarStyle === option} />
            {t(`toolbar.style.${option}`)}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => COMMANDS_BY_ID.get('app.showShortcuts')?.run()}>
          <Keyboard aria-hidden />
          {t('shortcuts.title')}
          {shortcutsBinding && (
            <kbd aria-hidden className="kbd-hint ml-auto">
              {formatBinding(shortcutsBinding, IS_MAC)}
            </kbd>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
