<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const dot = ref<HTMLElement | null>(null)
const ring = ref<HTMLElement | null>(null)
let media: MediaQueryList | undefined
let frame = 0
let visible = false
let targetX = 0
let targetY = 0
let ringX = 0
let ringY = 0

function hide() {
  visible = false
  cancelAnimationFrame(frame)
  frame = 0
  delete document.documentElement.dataset.customCursor
  dot.value?.classList.remove('is-visible')
  ring.value?.classList.remove('is-visible')
}

function follow() {
  frame = 0
  if (!visible || !ring.value) return
  ringX += (targetX - ringX) * 0.15
  ringY += (targetY - ringY) * 0.15
  ring.value.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`
  if (Math.abs(targetX - ringX) + Math.abs(targetY - ringY) > 0.1) frame = requestAnimationFrame(follow)
}

function move(event: PointerEvent) {
  if (!media?.matches || event.pointerType !== 'mouse' || !dot.value || !ring.value) { hide(); return }
  const element = event.target instanceof Element ? event.target : null
  // Preserve the native text caret, resize handles and disabled-control affordances.
  if (element?.closest('input, textarea, [contenteditable="true"], [disabled], [aria-disabled="true"], [role="separator"]')) { hide(); return }
  targetX = event.clientX
  targetY = event.clientY
  dot.value.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`
  ring.value.classList.toggle('is-interactive', Boolean(element?.closest('button, a, [role="button"], label, [tabindex="0"]')))
  if (!visible) {
    ringX = targetX
    ringY = targetY
    ring.value.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`
    visible = true
    document.documentElement.dataset.customCursor = ''
    dot.value.classList.add('is-visible')
    ring.value.classList.add('is-visible')
  }
  if (!frame) frame = requestAnimationFrame(follow)
}

onMounted(() => {
  media = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
  media.addEventListener('change', hide)
  document.addEventListener('pointermove', move, { passive: true })
  document.documentElement.addEventListener('mouseleave', hide)
  document.addEventListener('keydown', hide)
  document.addEventListener('visibilitychange', hide)
  window.addEventListener('blur', hide)
  window.addEventListener('scroll', hide, true)
})
onBeforeUnmount(() => {
  hide()
  media?.removeEventListener('change', hide)
  document.removeEventListener('pointermove', move)
  document.documentElement.removeEventListener('mouseleave', hide)
  document.removeEventListener('keydown', hide)
  document.removeEventListener('visibilitychange', hide)
  window.removeEventListener('blur', hide)
  window.removeEventListener('scroll', hide, true)
})
</script>

<template>
  <Teleport to="body">
    <div ref="dot" class="ambient-cursor ambient-cursor-dot" aria-hidden="true"></div>
    <div ref="ring" class="ambient-cursor ambient-cursor-ring" aria-hidden="true"></div>
  </Teleport>
</template>

<style>
html[data-custom-cursor], html[data-custom-cursor] * { cursor: none !important; }
.ambient-cursor { position: fixed; top: 0; left: 0; z-index: 2147483647; pointer-events: none; opacity: 0; transition: opacity 180ms; }
.ambient-cursor.is-visible { opacity: 1; }
.ambient-cursor::before { content: ''; position: absolute; top: 0; left: 0; border-radius: 50%; transform: translate(-50%, -50%); }
.ambient-cursor-dot::before { width: 5px; height: 5px; background: hsl(var(--foreground)); box-shadow: 0 0 0 1px hsl(var(--card) / 0.65); }
.ambient-cursor-ring::before { width: 32px; height: 32px; border: 1px solid hsl(var(--foreground) / 0.4); transition: width 180ms, height 180ms, background-color 180ms; }
.ambient-cursor-ring.is-interactive::before { width: 42px; height: 42px; background: hsl(var(--primary) / 0.06); }
@media (prefers-reduced-motion: reduce), (pointer: coarse) { .ambient-cursor { display: none; } }
</style>
