<script setup lang="ts">
import { onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{ text: string; interval?: number }>(), { interval: 70 })
const displayed = ref(props.text)
const typing = ref(false)
let timer: ReturnType<typeof setInterval> | undefined
let media: MediaQueryList | undefined
function stop() { clearInterval(timer); timer = undefined; typing.value = false }
function finish() { stop(); displayed.value = props.text }
function start() {
  stop()
  if (!media?.matches || document.hidden) { finish(); return }
  const characters = Array.from(props.text)
  let index = 0
  displayed.value = ''
  typing.value = true
  timer = setInterval(() => {
    displayed.value += characters[index++] ?? ''
    if (index >= characters.length) stop()
  }, Math.max(16, props.interval))
}
onMounted(() => {
  media = matchMedia('(prefers-reduced-motion: no-preference)')
  media.addEventListener('change', finish)
  document.addEventListener('visibilitychange', finish)
  start()
})
watch(() => props.text, start)
onDeactivated(finish)
onBeforeUnmount(() => { stop(); media?.removeEventListener('change', finish); document.removeEventListener('visibilitychange', finish) })
</script>
<template>
  <span class="typewriter-text">
    <span class="sr-only">{{ text }}</span>
    <span class="typewriter-reserve" aria-hidden="true">{{ text }}</span>
    <span class="typewriter-visual" aria-hidden="true"><span :class="{ 'is-typing': typing }">{{ displayed }}</span></span>
  </span>
</template>
<style scoped>
.typewriter-text { display: inline-grid; vertical-align: bottom; }
.typewriter-reserve, .typewriter-visual { grid-area: 1 / 1; }
.typewriter-reserve { visibility: hidden; }
.typewriter-visual .is-typing { border-right: 2px solid currentColor; animation: typewriter-blink 700ms step-end infinite; }
@keyframes typewriter-blink { 0%, 100% { border-right-color: currentColor; } 50% { border-right-color: transparent; } }
</style>
