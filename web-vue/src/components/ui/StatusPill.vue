<script setup lang="ts">
import MetaChip from './MetaChip.vue'
import HoverCard from './HoverCard.vue'
import type { Tone } from './types'
withDefaults(defineProps<{
  label: string; tone?: Tone; variant?: 'soft' | 'outline' | 'solid'; size?: 'xs' | 'sm' | 'md'
  radius?: 'pill' | 'rounded'; bordered?: boolean; toneClass?: string; title?: string
  detail?: string; rawError?: string; detailLabel?: string; rawErrorLabel?: string; cardClass?: string; pillClass?: string
}>(), { bordered: true, detailLabel: '状态说明', rawErrorLabel: '原始报错' })
</script>
<template>
  <HoverCard v-if="title || detail || rawError || $slots.content" :card-class="cardClass" focusable>
    <MetaChip :tone="tone" :variant="variant" :size="size" :radius="radius" :bordered="bordered" :tone-class="toneClass" :chip-class="pillClass">{{ label }}</MetaChip>
    <template #content>
      <slot name="content">
        <p v-if="title" class="ui-status-title">{{ title }}</p>
        <p v-if="detail" class="ui-status-body"><span class="sr-only">{{ detailLabel }}：</span>{{ detail }}</p>
        <template v-if="rawError"><p class="mt-3 text-xs font-semibold">{{ rawErrorLabel }}</p><pre class="ui-code-block mt-2 max-h-64 overflow-auto whitespace-pre-wrap">{{ rawError }}</pre></template>
      </slot>
    </template>
  </HoverCard>
  <MetaChip v-else :tone="tone" :variant="variant" :size="size" :radius="radius" :bordered="bordered" :tone-class="toneClass" :chip-class="pillClass">{{ label }}</MetaChip>
</template>
