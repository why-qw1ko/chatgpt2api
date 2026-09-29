<script setup lang="ts">
import { ElSegmented } from 'element-plus'
import type { SegmentedOption, SegmentedValue } from './types'
withDefaults(defineProps<{ modelValue: SegmentedValue; options: readonly SegmentedOption[]; ariaLabel?: string; fit?: 'content' | 'stretch' }>(), { fit: 'content' })
const emit = defineEmits<{ 'update:modelValue': [value: SegmentedValue] }>()
</script>
<template>
  <div class="lux-segmented-scroll" :class="{ 'w-full': fit === 'stretch' }">
    <ElSegmented :model-value="modelValue" :options="[...options]" :block="fit === 'stretch'" :aria-label="ariaLabel"
      @update:model-value="emit('update:modelValue', $event)">
      <template #default="{ item }"><span>{{ item.label }}</span><span v-if="item.count !== undefined" class="lux-segment-count">{{ item.count }}</span></template>
    </ElSegmented>
  </div>
</template>
