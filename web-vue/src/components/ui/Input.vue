<script setup lang="ts">
import { ref } from 'vue'
import { ElInput, type InputInstance } from 'element-plus'
import type { ButtonSize } from './types'
defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{
  modelValue?: string | number
  type?: string
  size?: ButtonSize
  block?: boolean
  rootClass?: string
  radius?: string
  bordered?: boolean
  strong?: boolean
}>(), { size: 'sm', type: 'text' })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const control = ref<InputInstance>()
defineExpose({ focus: () => control.value?.focus(), blur: () => control.value?.blur() })
</script>

<template>
  <ElInput ref="control" v-bind="$attrs" :model-value="modelValue" :type="type"
    :size="size === 'xs' ? 'small' : size === 'md' ? 'large' : 'default'"
    class="lux-input" :class="[rootClass, { 'lux-input--block': block, 'font-semibold': strong }]"
    @update:model-value="emit('update:modelValue', $event)" />
</template>
