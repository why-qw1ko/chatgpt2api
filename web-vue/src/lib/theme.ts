import { getStringPreference, preferenceKeys, setStringPreference } from './preferences'

export type ThemeMode = 'light' | 'dark'

export function normalizeThemeMode(value: unknown): ThemeMode {
  if (value === 'dark' || value === 'mono-dark') return 'dark'
  if (value === 'light') return 'light'
  return 'light'
}

export function getStoredThemeMode(): ThemeMode {
  return normalizeThemeMode(getStringPreference(preferenceKeys.themeMode, 'light'))
}

export function applyThemeMode(mode: ThemeMode): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.themePreference = mode
  root.classList.toggle('dark', mode === 'dark')
  if (mode === 'dark') {
    root.dataset.theme = 'dark'
    root.style.colorScheme = 'dark'
    return
  }
  delete root.dataset.theme
  root.style.colorScheme = 'light'
}

export function setStoredThemeMode(mode: ThemeMode): void {
  const normalized = normalizeThemeMode(mode)
  setStringPreference(preferenceKeys.themeMode, normalized)
  applyThemeMode(normalized)
}
