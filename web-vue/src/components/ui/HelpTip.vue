<script setup lang="ts">
import { Icon } from '@iconify/vue'
import Tooltip from './Tooltip.vue'
defineProps<{ text: string }>()
</script>
<template><Tooltip :text="text"><button type="button" class="lux-help" :aria-label="text"><Icon icon="lucide:circle-help" class="h-3.5 w-3.5" /></button></Tooltip></template>
