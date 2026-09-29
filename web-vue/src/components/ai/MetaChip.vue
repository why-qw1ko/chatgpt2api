<template>
  <ElementMetaChip
    :tone="elementTone"
    :variant="props.variant"
    :size="props.size"
    :radius="props.radius"
    :bordered="props.bordered"
    :strong="props.strong"
    :chip-class="resolvedChipClass"
  >
    <slot />
  </ElementMetaChip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MetaChip as ElementMetaChip } from '@/components/ui'

type MetaChipTone = 'default' | 'muted' | 'success' | 'warning' | 'danger' | 'info'
type MetaChipVariant = 'soft' | 'outline' | 'solid'
type MetaChipSize = 'xs' | 'sm' | 'md'

const props = withDefaults(defineProps<{
  tone?: MetaChipTone
  variant?: MetaChipVariant
  size?: MetaChipSize
  radius?: 'pill' | 'rounded'
  bordered?: boolean
  strong?: boolean
  chipClass?: string
}>(), {
  tone: 'default',
  variant: 'soft',
  size: 'sm',
  radius: 'pill',
  bordered: true,
  strong: false,
  chipClass: '',
})

const elementTone = computed(() => {
  if (props.tone === 'success') return 'success'
  if (props.tone === 'warning') return 'warning'
  if (props.tone === 'danger') return 'error'
  if (props.tone === 'info') return 'info'
  return 'neutral'
})

const resolvedChipClass = computed(() => {
  return ['min-w-0 tracking-normal', props.chipClass]
    .filter(Boolean)
    .join(' ')
})
</script>
