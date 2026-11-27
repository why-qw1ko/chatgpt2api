<script setup lang="ts">
import { ElCard } from 'element-plus'
defineProps<{ title: string; description?: string; rootClass?: string; panelClass?: string; variant?: string; size?: string }>()
</script>
<template>
  <ElCard shadow="never" class="lux-chart-card" :class="[rootClass, panelClass]">
    <template #header><div class="flex flex-wrap items-center justify-between gap-3"><div class="flex items-center gap-2"><h3 class="ui-section-title">{{ title }}</h3><slot name="title-extra" /></div><slot name="actions" /></div><p v-if="description" class="mt-2 text-xs text-muted-foreground">{{ description }}</p></template>
    <slot />
  </ElCard>
</template>
