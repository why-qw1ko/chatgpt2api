<script setup lang="ts">
import { ElEmpty } from 'element-plus'
import { Icon } from '@iconify/vue'
defineProps<{ title: string; description?: string; plain?: boolean; size?: string; rootClass?: string; tone?: string; variant?: string }>()
</script>
<template>
  <ElEmpty :image-size="size === 'sm' ? 56 : 80" class="lux-empty" :class="rootClass">
    <template #image><slot name="icon"><Icon icon="lucide:inbox" class="mx-auto h-12 w-12 text-muted-foreground" /></slot></template>
    <template #description><p class="font-medium text-foreground">{{ title }}</p><p v-if="description" class="mx-auto mt-2 max-w-md break-words text-xs leading-6 text-muted-foreground">{{ description }}</p></template>
    <slot name="actions" />
  </ElEmpty>
</template>
