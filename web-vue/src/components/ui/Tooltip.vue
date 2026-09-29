<script setup lang="ts">
import { ElTooltip } from 'element-plus'
withDefaults(defineProps<{ text: string; placement?: 'top' | 'right' | 'bottom' | 'left'; offset?: number }>(), { placement: 'top', offset: 8 })
</script>
<template>
  <ElTooltip :content="text" :placement="placement" :offset="offset" :show-after="300" :hide-after="0" :disabled="!text" :trigger="['hover', 'focus']" effect="dark">
    <span class="lux-tooltip-trigger"><slot /></span>
  </ElTooltip>
</template>
