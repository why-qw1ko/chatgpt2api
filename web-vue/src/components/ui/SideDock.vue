<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ElButton } from 'element-plus'
withDefaults(defineProps<{ open: boolean; ariaLabel?: string; ariaDescribedby?: string; zIndex?: number; width?: string; rootClass?: string; draggable?: boolean }>(), { width: '11rem', zIndex: 2100, ariaLabel: '展开面板' })
const emit = defineEmits<{ click: [] }>()
const top = ref<number | null>(null)
let origin = 0
let start = 0
let moved = false
let dragging = false
function down(event: PointerEvent, enabled: boolean) {
  moved = false
  if (!enabled || event.button !== 0 || window.innerWidth < 768) return
  const target = event.currentTarget as HTMLElement
  origin = target.getBoundingClientRect().top
  start = event.clientY
  dragging = true
  target.setPointerCapture(event.pointerId)
}
function move(event: PointerEvent) {
  if (!dragging) return
  if (Math.abs(event.clientY - start) > 4) moved = true
  if (moved) top.value = Math.max(16, Math.min(window.innerHeight - (event.currentTarget as HTMLElement).offsetHeight - 16, origin + event.clientY - start))
}
function resize() { top.value = null }
function activate() {
  if (moved) { moved = false; return }
  emit('click')
}
onMounted(() => window.addEventListener('resize', resize))
onBeforeUnmount(() => window.removeEventListener('resize', resize))
</script>
<template>
  <Teleport to="body">
    <ElButton v-if="open" class="lux-side-dock" :class="rootClass" :aria-label="ariaLabel" :aria-describedby="ariaDescribedby"
      :style="{ width, zIndex: zIndex < 2000 ? 2000 + zIndex : zIndex, top: top === null ? undefined : `${top}px`, bottom: top === null ? undefined : 'auto' }"
      @pointerdown="down($event, Boolean(draggable))" @pointermove="move" @pointerup="dragging = false" @pointercancel="dragging = false"
      @click="activate"><slot /></ElButton>
  </Teleport>
</template>
