<script setup lang="ts">
import { ElButton } from 'element-plus'
import { Icon } from '@iconify/vue'
withDefaults(defineProps<{ label?: string; icon?: string; disabled?: boolean; tone?: 'default' | 'dark'; size?: 'sm' | 'md'; rootClass?: string }>(), { label: '关闭', icon: 'lucide:x', size: 'sm' })
</script>
<template>
  <ElButton text :disabled="disabled" :aria-label="label" :title="label" class="lux-close" :class="[rootClass, { 'lux-close--dark': tone === 'dark' }]">
    <Icon :icon="icon" :class="size === 'md' ? 'h-5 w-5' : 'h-4 w-4'" />
  </ElButton>
</template>
