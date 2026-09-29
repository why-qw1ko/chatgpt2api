/** Product presentation contracts, independent of the component-library API. */
export type Tone = 'neutral' | 'success' | 'warning' | 'error' | 'info'
export type ButtonSize = 'xs' | 'sm' | 'md'
export type MenuPlacement = 'auto' | 'top' | 'bottom' | 'left' | 'right' | 'up' | 'down'
export type ActionMenuItem = {
  key: string
  label: string
  danger?: boolean
  disabled?: boolean
  dividerBefore?: boolean
  active?: boolean
  heading?: boolean
  children?: ActionMenuItem[]
}
export type SelectOption = { label: string; value: string; disabled?: boolean }
export type GroupedSelectGroup = { label?: string; options: SelectOption[] }
export type SegmentedValue = string | number
export type SegmentedOption = { label: string; value: SegmentedValue; count?: string | number; disabled?: boolean }
export type KeyValueItem = { label: string; value: string; hint?: string; key?: string; mono?: boolean; badge?: string; badgeClass?: string }
export const OVERLAY_LAYER = { modal: 120, drawer: 130, confirm: 300, dock: 110 } as const
export function elementTone(tone?: Tone) {
  return tone === 'error' ? 'danger' : tone === 'neutral' || !tone ? 'info' : tone
}
