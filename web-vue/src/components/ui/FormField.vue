<script setup lang="ts">
import { ElFormItem } from 'element-plus'
defineProps<{ label: string; hint?: string; required?: boolean; requiredText?: string }>()
</script>
<template>
  <ElFormItem :label="label" label-position="top" :required="required" class="lux-field">
    <template #label><span>{{ label }}</span><slot name="label-extra" /><span v-if="requiredText" class="text-xs text-muted-foreground">{{ requiredText }}</span></template>
    <div class="w-full min-w-0"><slot /><p v-if="hint" class="mt-1.5 text-xs leading-relaxed text-muted-foreground">{{ hint }}</p></div>
  </ElFormItem>
</template>
