<template>
  <MetaChip size="xs" radius="rounded" :bordered="false" :tone="tones[badge.state]" chip-class="shrink-0">
    {{ badge.label }}
  </MetaChip>
</template>

<script setup lang="ts">
import { MetaChip } from '@/components/ui'
import type { Tone } from '@/components/ui/types'
import type { StudioConversationBadge, StudioConversationBadgeState } from './types'

defineProps<{ badge: StudioConversationBadge }>()

const tones: Record<StudioConversationBadgeState, Tone> = {
  running: 'info',
  done: 'success',
  error: 'error',
  expired: 'warning',
}
</script>
