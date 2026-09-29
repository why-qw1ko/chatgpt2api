<script setup lang="ts">
import { ElRadioGroup, ElRadioButton } from 'element-plus'
import { Icon } from '@iconify/vue'
withDefaults(defineProps<{ modelValue: 'list' | 'cards'; listLabel?: string; cardsLabel?: string }>(), { listLabel: '列表视图', cardsLabel: '卡片视图' })
const emit = defineEmits<{ 'update:modelValue': [value: 'list' | 'cards'] }>()
</script>
<template>
  <ElRadioGroup :model-value="modelValue" aria-label="显示方式" @update:model-value="emit('update:modelValue', $event as 'list' | 'cards')">
    <ElRadioButton value="list" :aria-label="listLabel"><Icon icon="lucide:list" class="h-4 w-4" /><span class="sr-only">{{ listLabel }}</span></ElRadioButton>
    <ElRadioButton value="cards" :aria-label="cardsLabel"><Icon icon="lucide:layout-grid" class="h-4 w-4" /><span class="sr-only">{{ cardsLabel }}</span></ElRadioButton>
  </ElRadioGroup>
</template>
