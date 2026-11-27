<script setup lang="ts">
import { ElDescriptions, ElDescriptionsItem } from 'element-plus'
import type { KeyValueItem } from './types'
withDefaults(defineProps<{ items: KeyValueItem[]; columns?: 1 | 2 | 3; rootClass?: string; size?: string; variant?: string }>(), { columns: 1 })
</script>
<template>
  <ElDescriptions :column="columns" direction="vertical" size="small" class="lux-descriptions" :class="rootClass">
    <ElDescriptionsItem v-for="item in items" :key="item.key || item.label" :label="item.label">
      <span :class="{ 'font-mono': item.mono }" class="break-words">{{ item.value }}</span><span v-if="item.badge" :class="item.badgeClass">{{ item.badge }}</span><p v-if="item.hint" class="text-xs text-muted-foreground">{{ item.hint }}</p>
    </ElDescriptionsItem>
  </ElDescriptions>
</template>
