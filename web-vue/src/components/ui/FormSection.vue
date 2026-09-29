<script setup lang="ts">
import { ElCard } from 'element-plus'
defineProps<{ title?: string; description?: string; bodyClass?: string; rootClass?: string; panelClass?: string; variant?: string; size?: string }>()
</script>
<template>
  <ElCard shadow="never" class="lux-form-card" :class="[rootClass, panelClass]" :body-class="bodyClass">
    <template v-if="title" #header><div class="flex items-center gap-2"><h3 class="ui-section-title">{{ title }}</h3><slot name="title-extra" /></div><p v-if="description" class="mt-2 text-xs text-muted-foreground">{{ description }}</p></template>
    <slot />
  </ElCard>
</template>
