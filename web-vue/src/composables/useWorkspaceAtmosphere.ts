import { onBeforeUnmount, onMounted, type Ref } from 'vue'

/** Presentation only: one delegated, frame-limited light for workspace surfaces. */
export function useWorkspaceAtmosphere(root: Ref<HTMLElement | null>) {
  let frame = 0
  let surface: HTMLElement | null = null
  let pointerX = 0
  let pointerY = 0
  let media: MediaQueryList | null = null

  function clear() {
    cancelAnimationFrame(frame)
    frame = 0
    surface?.removeAttribute('data-lit')
    surface = null
  }

  function move(event: PointerEvent) {
    if (!media?.matches || event.pointerType === 'touch') return
    const next = event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-spotlight]') : null
    if (!next || !root.value?.contains(next)) { clear(); return }
    if (surface !== next) {
      clear()
      surface = next
      surface.setAttribute('data-lit', '')
    }
    pointerX = event.clientX
    pointerY = event.clientY
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      if (!surface) return
      const rect = surface.getBoundingClientRect()
      surface.style.setProperty('--light-x', `${pointerX - rect.left}px`)
      surface.style.setProperty('--light-y', `${pointerY - rect.top}px`)
    })
  }

  onMounted(() => {
    document.documentElement.setAttribute('data-workspace', '')
    media = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
    media.addEventListener('change', clear)
    root.value?.addEventListener('pointermove', move, { passive: true })
    root.value?.addEventListener('pointerleave', clear)
    root.value?.addEventListener('scroll', clear, true)
    window.addEventListener('blur', clear)
  })
  onBeforeUnmount(() => {
    clear()
    media?.removeEventListener('change', clear)
    root.value?.removeEventListener('pointermove', move)
    root.value?.removeEventListener('pointerleave', clear)
    root.value?.removeEventListener('scroll', clear, true)
    window.removeEventListener('blur', clear)
    document.documentElement.removeAttribute('data-workspace')
  })
}
