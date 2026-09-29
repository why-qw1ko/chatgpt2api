<script setup lang="ts">
import { ElTag } from 'element-plus'
import { elementTone, type Tone } from './types'
withDefaults(defineProps<{
  tone?: Tone; variant?: 'soft' | 'outline' | 'solid'; size?: 'xs' | 'sm' | 'md'
  radius?: 'pill' | 'rounded'; bordered?: boolean; strong?: boolean; toneClass?: string; chipClass?: string
}>(), { tone: 'neutral', variant: 'soft', size: 'sm', bordered: true })
</script>
<template>
  <ElTag :type="elementTone(tone)" :effect="variant === 'solid' ? 'dark' : variant === 'outline' ? 'plain' : 'light'"
    :size="size === 'md' ? 'default' : 'small'" :round="radius === 'pill'" :disable-transitions="true"
    class="lux-tag" :class="[chipClass, toneClass, { 'lux-tag--neutral': tone === 'neutral', 'lux-tag--borderless': !bordered, 'font-semibold': strong }]"><slot /></ElTag>
</template>
