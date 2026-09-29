import { trapFocusWithin } from '@/lib/focusLoop'

// Element Plus 2.14 can treat the first Tab after a click as pointer focus and
// let it escape at a boundary. Keep its autofocus/restore lifecycle intact.
export function keepModalTabBoundary(event: KeyboardEvent) {
  if (trapFocusWithin(event.currentTarget as HTMLElement, event)) {
    event.stopImmediatePropagation()
  }
}
