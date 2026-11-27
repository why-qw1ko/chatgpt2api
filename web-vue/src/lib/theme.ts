import { readonly, ref } from 'vue'
import { getStringPreference, preferenceKeys, setStringPreference } from './preferences'

export type ThemeMode = 'light' | 'dark'

export const themePresets = [
  { label: '海湾蓝', color: '#2459E7' },
  { label: '靛紫', color: '#6943CC' },
  { label: '青蓝', color: '#087D8D' },
  { label: '琥珀', color: '#A85814' },
] as const

export const defaultThemeAccent = themePresets[0].color

const mode = ref<ThemeMode>('light')
const accent = ref<string>(defaultThemeAccent)
export const themeMode = readonly(mode)
export const themeAccent = readonly(accent)

function normalizeThemeAccent(value: unknown): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
    ? value.toUpperCase()
    : defaultThemeAccent
}

function luminance(rgb: readonly number[]): number {
  const [red, green, blue] = rgb.map(channel => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ))
  return red * 0.2126 + green * 0.7152 + blue * 0.0722
}

function accentHsl(color: string, dark: boolean): [number, number, number] {
  const rgb = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16) / 255)
  const ink = luminance([13 / 255, 20 / 255, 33 / 255])
  // Keep the accent as close to the picked color as possible while ensuring readable button text.
  const limit = dark ? (ink + 0.05) * 5 - 0.05 : 1.05 / 5 - 0.05
  const readable = (channels: number[]) => dark ? luminance(channels) >= limit : luminance(channels) <= limit
  if (!readable(rgb)) {
    let low = 0
    let high = 1
    const toward = dark ? 1 : 0
    const mix = (amount: number) => rgb.map(channel => channel + (toward - channel) * amount)
    for (let step = 0; step < 12; step += 1) {
      const middle = (low + high) / 2
      if (readable(mix(middle))) high = middle
      else low = middle
    }
    rgb.splice(0, 3, ...mix(high))
  }

  const [red, green, blue] = rgb
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const chroma = max - min
  const lightness = (max + min) / 2
  if (!chroma) return [0, 0, lightness * 100]

  let hue = (red - green) / chroma + 4
  if (max === red) hue = (green - blue) / chroma
  else if (max === green) hue = (blue - red) / chroma + 2
  return [(hue * 60 + 360) % 360, chroma / (1 - Math.abs(2 * lightness - 1)) * 100, lightness * 100]
}

function applyTheme(): void {
  const root = document.documentElement
  const dark = mode.value === 'dark'
  root.dataset.themePreference = mode.value
  root.classList.toggle('dark', dark)
  if (dark) root.dataset.theme = 'dark'
  else delete root.dataset.theme
  root.style.colorScheme = mode.value

  const [hue, saturation, lightness] = accentHsl(accent.value, dark)
  root.style.setProperty('--primary', `${hue} ${saturation}% ${lightness}%`)
  root.style.setProperty('--secondary', `${hue} ${saturation * 0.55}% ${dark ? 23 : 96}%`)
  const secondaryLightness = dark ? Math.min(100, Math.max(76, lightness)) : Math.max(0, lightness - 5)
  root.style.setProperty('--secondary-foreground', `${hue} ${saturation}% ${secondaryLightness}%`)
}

export function initializeTheme(): void {
  try {
    const storedMode = getStringPreference(preferenceKeys.themeMode)
    mode.value = storedMode === 'dark' || storedMode === 'mono-dark' ? 'dark' : 'light'
    accent.value = normalizeThemeAccent(getStringPreference(preferenceKeys.themeAccent))
  } catch {
    // Leave the default appearance available if local storage is blocked.
  }
  applyTheme()
}

function saveThemePreference(key: typeof preferenceKeys.themeMode | typeof preferenceKeys.themeAccent, value: string): void {
  applyTheme()
  try {
    setStringPreference(key, value)
  } catch {
    // The active page can still use the preference if it cannot be saved.
  }
}

export function setThemeMode(value: ThemeMode): void {
  mode.value = value
  saveThemePreference(preferenceKeys.themeMode, value)
}

export function setThemeAccent(value: unknown): void {
  accent.value = normalizeThemeAccent(value)
  saveThemePreference(preferenceKeys.themeAccent, accent.value)
}
