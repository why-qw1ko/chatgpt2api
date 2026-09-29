<script setup lang="ts">
withDefaults(defineProps<{ value?: string | number; tag?: string; mono?: boolean; size?: string; emphasis?: string; breakMode?: string; rootClass?: string }>(), { tag: 'div' })
</script>
<template><component :is="tag" class="lux-value-surface" :class="[rootClass, { 'font-mono': mono, 'text-muted-foreground': emphasis === 'muted', 'break-all': breakMode === 'all', 'break-words': breakMode === 'words' }]"><slot>{{ value }}</slot></component></template>
