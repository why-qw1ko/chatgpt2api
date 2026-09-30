import { onBeforeUnmount, onMounted, type Ref } from 'vue'

/** Presentation only: one delegated, frame-limited light for workspace surfaces. */
export function useWorkspaceAtmosphere(root: Ref<HTMLElement | null>) {
  let frame = 0
  let surface: HTMLElement | null = null
  let pointerX = 0
  let pointerY = 0
  let bounds: DOMRect | null = null
  let media: MediaQueryList | null = null

  function clear() {
    cancelAnimationFrame(frame)
    frame = 0
    surface?.removeAttribute('data-lit')
    surface?.style.removeProperty('--tilt-x')
    surface?.style.removeProperty('--tilt-y')
    bounds = null
    surface = null
  }

  function keyboard(event: KeyboardEvent) {
    if (event.key === 'Tab' || event.key.startsWith('Arrow')) document.documentElement.dataset.inputMode = 'keyboard'
  }
  function pointer() { document.documentElement.dataset.inputMode = 'pointer' }

  function move(event: PointerEvent) {
    if (!media?.matches || event.pointerType === 'touch') return
    const next = event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-spotlight]') : null
    if (!next || !root.value?.contains(next)) { clear(); return }
    if (surface !== next) {
      clear()
      surface = next
      bounds = surface.getBoundingClientRect()
      surface.setAttribute('data-lit', '')
    }
    pointerX = event.clientX
    pointerY = event.clientY
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      if (!surface) return
      const rect = bounds || surface.getBoundingClientRect()
      surface.style.setProperty('--light-x', `${pointerX - rect.left}px`)
      surface.style.setProperty('--light-y', `${pointerY - rect.top}px`)
      if (surface.hasAttribute('data-tilt')) {
        const x = Math.max(-1, Math.min(1, (pointerX - rect.left) / rect.width * 2 - 1))
        const y = Math.max(-1, Math.min(1, (pointerY - rect.top) / rect.height * 2 - 1))
        surface.style.setProperty('--tilt-x', `${-y * 15}deg`)
        surface.style.setProperty('--tilt-y', `${x * 15}deg`)
      }
    })
  }

  onMounted(() => {
    document.documentElement.setAttribute('data-workspace', '')
    document.addEventListener('keydown', keyboard, true)
    document.addEventListener('pointerdown', pointer, true)
    media = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
    media.addEventListener('change', clear)
    root.value?.addEventListener('pointermove', move, { passive: true })
    root.value?.addEventListener('pointerleave', clear)
    root.value?.addEventListener('scroll', clear, true)
    window.addEventListener('blur', clear)
    window.addEventListener('resize', clear)
  })
  onBeforeUnmount(() => {
    clear()
    media?.removeEventListener('change', clear)
    root.value?.removeEventListener('pointermove', move)
    root.value?.removeEventListener('pointerleave', clear)
    root.value?.removeEventListener('scroll', clear, true)
    window.removeEventListener('blur', clear)
    window.removeEventListener('resize', clear)
    document.removeEventListener('keydown', keyboard, true)
    document.removeEventListener('pointerdown', pointer, true)
    delete document.documentElement.dataset.inputMode
    document.documentElement.removeAttribute('data-workspace')
  })
}
