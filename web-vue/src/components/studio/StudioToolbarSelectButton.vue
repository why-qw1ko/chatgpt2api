<template>
  <Button
    class="studio-toolbar-select-button"
    :aria-expanded="expanded"
    :disabled="disabled"
  >
    <slot />
  </Button>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui'
defineProps<{
  disabled?: boolean
  expanded?: boolean
}>()
</script>

<style scoped>
.studio-toolbar-select-button {
  flex: 0 0 auto;
  white-space: nowrap;
}
</style>
