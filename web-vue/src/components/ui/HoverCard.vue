<script setup lang="ts">
import { ElPopover } from 'element-plus'
withDefaults(defineProps<{ cardClass?: string; offset?: number; focusable?: boolean }>(), { offset: 8 })
</script>
<template>
  <ElPopover :trigger="['hover', 'focus']" :show-after="150" :hide-after="120" :offset="offset" width="auto" :popper-class="['lux-hover-card', cardClass].filter(Boolean).join(' ')" :show-arrow="false">
    <template #reference><span class="lux-tooltip-trigger" :tabindex="focusable ? 0 : undefined"><slot /></span></template>
    <slot name="content" />
  </ElPopover>
</template>
