<script setup lang="ts">
import { ElCheckbox } from 'element-plus'
defineProps<{ modelValue: boolean; disabled?: boolean; indeterminate?: boolean; ariaLabel?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>
<template>
  <ElCheckbox :model-value="modelValue" :disabled="disabled" :indeterminate="indeterminate"
    :aria-label="ariaLabel" @update:model-value="emit('update:modelValue', Boolean($event))"><slot /></ElCheckbox>
</template>
