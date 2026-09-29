<script setup lang="ts" generic="T extends string | string[]">
import { ElSelect, ElOption, ElOptionGroup } from 'element-plus'
import { ChevronDownIcon } from './icons'
import type { GroupedSelectGroup, SelectOption, MenuPlacement } from './types'
withDefaults(defineProps<{
  modelValue: T
  options?: readonly SelectOption[]
  groups?: readonly GroupedSelectGroup[]
  multiple?: boolean
  disabled?: boolean
  placeholder?: string
  ariaLabel?: string
  maxVisibleLabels?: number
  selectedCountText?: string
  selectedIndicator?: string
  showGroupLabels?: boolean
  groupLabelAlign?: string
  valueAlign?: string
  placement?: MenuPlacement
  block?: boolean
}>(), { options: () => [], groups: () => [], placeholder: '请选择', showGroupLabels: true, maxVisibleLabels: 1 })
const emit = defineEmits<{ 'update:modelValue': [value: T] }>()
</script>
<template>
  <ElSelect :model-value="modelValue" :multiple="multiple" :disabled="disabled" :suffix-icon="ChevronDownIcon"
    :placeholder="placeholder" :aria-label="ariaLabel || placeholder" :collapse-tags="multiple"
    collapse-tags-tooltip :max-collapse-tags="maxVisibleLabels"
    :placement="placement === 'up' || placement === 'top' ? 'top-start' : 'bottom-start'"
    class="lux-select" :class="{ 'lux-select--block': block }" :style="{ textAlign: valueAlign as 'left' | 'center' | 'right' }"
    @update:model-value="emit('update:modelValue', $event as T)">
    <ElOption v-for="option in options" :key="option.value" v-bind="option" />
    <template v-for="(group, index) in groups" :key="index">
      <ElOptionGroup v-if="showGroupLabels && group.label" :label="group.label">
        <ElOption v-for="option in group.options" :key="option.value" v-bind="option" />
      </ElOptionGroup>
      <template v-else><ElOption v-for="option in group.options" :key="option.value" v-bind="option" /></template>
    </template>
  </ElSelect>
</template>
