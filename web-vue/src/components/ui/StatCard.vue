<script setup lang="ts">
import { computed, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import { ElCard, ElStatistic } from 'element-plus'
import { Icon } from '@iconify/vue'
import type { Tone } from './types'
const props = defineProps<{ animate?: boolean; label: string; value: string | number; caption?: string; icon?: string; iconTone?: Tone; iconBg?: string; iconColor?: string; rootClass?: string; panelClass?: string; variant?: string; size?: string }>()

const current = ref(0)
let frame = 0
let media: MediaQueryList | undefined
const numeric = computed(() => {
  const raw = String(props.value)
  return /^-?[\d,]+(?:\.\d+)?(?:%|ms|s)?$/.test(raw) ? Number(raw.replaceAll(',', '').replace(/(?:%|ms|s)$/, '')) : null
})
const animatedValue = computed(() => {
  if (numeric.value === null) return props.value
  const raw = String(props.value)
  const precision = raw.match(/\.(\d+)/)?.[1]?.length ?? 0
  return current.value.toLocaleString('en-US', { minimumFractionDigits: precision, maximumFractionDigits: precision }) + (raw.match(/(?:%|ms|s)$/)?.[0] ?? '')
})
function finish() { cancelAnimationFrame(frame); frame = 0; current.value = numeric.value ?? 0 }
function animate() {
  cancelAnimationFrame(frame)
  if (!props.animate || !media?.matches || numeric.value === null || document.hidden) { finish(); return }
  const from = current.value, target = numeric.value, start = performance.now()
  function tick(now: number) {
    const progress = Math.min(1, (now - start) / 900)
    const easeOutCubic = 1 - Math.pow(1 - progress, 3)
    current.value = from + (target - from) * easeOutCubic
    if (progress < 1) frame = requestAnimationFrame(tick)
    else finish()
  }
  frame = requestAnimationFrame(tick)
}
onMounted(() => {
  media = matchMedia('(prefers-reduced-motion: no-preference)')
  media.addEventListener('change', finish)
  document.addEventListener('visibilitychange', finish)
  animate()
})
watch(() => props.value, animate)
onDeactivated(finish)
onBeforeUnmount(() => { finish(); media?.removeEventListener('change', finish); document.removeEventListener('visibilitychange', finish) })
</script>
<template>
  <ElCard shadow="never" class="lux-stat-card" data-spotlight :class="[rootClass, panelClass]">
    <div class="flex items-center justify-between gap-2"><span class="lux-stat-label">{{ label }}</span><span v-if="icon" class="lux-stat-icon" :class="[`lux-stat-icon--${iconTone || 'neutral'}`, iconBg, iconColor]"><Icon :icon="icon" class="h-4 w-4" /></span></div>
    <strong v-if="animate" class="lux-stat-value" :aria-label="String(value)"><span aria-hidden="true">{{ animatedValue }}</span></strong>
    <ElStatistic v-else-if="typeof value === 'number'" :value="value" /><strong v-else class="lux-stat-value">{{ value }}</strong>
    <p v-if="caption" class="mt-2 text-xs text-muted-foreground">{{ caption }}</p>
  </ElCard>
</template>
