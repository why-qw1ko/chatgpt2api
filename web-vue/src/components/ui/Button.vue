<script setup lang="ts">
import { ref, type Component } from 'vue'
import { ElButton, type ButtonInstance } from 'element-plus'
import type { ButtonSize } from './types'
withDefaults(defineProps<{
  tag?: string | Component
  type?: 'button' | 'submit' | 'reset'
  size?: ButtonSize
  variant?: 'outline' | 'primary' | 'danger' | 'ghost'
  disabled?: boolean
  loading?: boolean
  iconOnly?: boolean
  block?: boolean
  rootClass?: string
}>(), { type: 'button', size: 'sm', variant: 'outline' })
const control = ref<ButtonInstance>()
defineExpose({ focus: () => control.value?.$el?.focus() })
</script>

<template>
  <ElButton ref="control" :tag="tag" :native-type="type" :disabled="disabled" :loading="loading" :aria-busy="loading || undefined"
    :type="variant === 'primary' ? 'primary' : variant === 'danger' ? 'danger' : 'default'"
    :plain="variant === 'danger'" :text="variant === 'ghost'" :size="size === 'xs' ? 'small' : size === 'md' ? 'large' : 'default'"
    class="lux-button" :class="[`lux-button--${variant}`, rootClass, { 'lux-button--icon': iconOnly, 'w-full': block }]">
    <slot />
  </ElButton>
</template>
