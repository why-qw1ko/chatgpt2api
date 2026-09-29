<script setup lang="ts">
import { ElSkeleton, ElSkeletonItem } from 'element-plus'
withDefaults(defineProps<{ title?: string; description?: string; compact?: boolean; align?: 'center' | 'start'; flush?: boolean }>(), { title: '正在加载', align: 'center' })
</script>
<template>
  <div class="lux-loading" :class="[{ 'lux-loading--compact': compact, 'lux-loading--flush': flush }, `lux-loading--${align}`]" role="status" aria-live="polite" aria-busy="true">
    <ElSkeleton animated :rows="0"><template #template><div class="lux-loading-shapes"><ElSkeletonItem variant="circle" style="width: 32px; height: 32px" /><ElSkeletonItem variant="text" style="width: 7rem" /><ElSkeletonItem variant="text" style="width: 10rem" /></div></template></ElSkeleton>
    <p class="mt-4 text-sm font-medium">{{ title }}</p><p v-if="description" class="mt-1 text-xs text-muted-foreground">{{ description }}</p>
  </div>
</template>
