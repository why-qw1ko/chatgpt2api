<script setup lang="ts">
import { ElDrawer } from 'element-plus'
import { keepModalTabBoundary } from './modalKeyboard'
import CloseButton from './CloseButton.vue'
withDefaults(defineProps<{
  open: boolean; title?: string; description?: string; maxWidth?: string; zIndex?: number
  closeOnOverlay?: boolean; closeOnEscape?: boolean; showBackdrop?: boolean; ariaLabel?: string
  bare?: boolean; rootClass?: string; overlayClass?: string; headerClass?: string; bodyClass?: string
  footerClass?: string; showClose?: boolean
}>(), { maxWidth: '32rem', zIndex: 130, closeOnOverlay: true, closeOnEscape: undefined, showBackdrop: true, showClose: true })
const emit = defineEmits<{ close: [] }>()
</script>
<template>
  <ElDrawer v-if="showBackdrop" :model-value="open" :title="title || ariaLabel" :size="`min(${maxWidth}, calc(100vw - 1rem))`"
    :z-index="zIndex < 2000 ? 2000 + zIndex : zIndex" :close-on-click-modal="closeOnOverlay"
    :close-on-press-escape="closeOnEscape ?? closeOnOverlay" :with-header="!bare" :show-close="false"
    append-to-body destroy-on-close class="lux-drawer" :class="rootClass" :modal-class="overlayClass"
    :header-class="headerClass" :body-class="['lux-drawer-body', bodyClass].filter(Boolean).join(' ')" :footer-class="footerClass"
    :before-close="() => emit('close')" @keydown.capture="keepModalTabBoundary">
    <template #header="{ titleId, titleClass }">
      <span :id="titleId" :class="titleClass">{{ title || ariaLabel }}</span>
      <CloseButton v-if="showClose" @click="emit('close')" />
    </template>
    <p v-if="description" class="mb-4 text-sm text-muted-foreground">{{ description }}</p><slot />
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </ElDrawer>
  <!-- Progress panels are non-modal; an ElDrawer would trap focus even without its mask. -->
  <Teleport v-else to="body">
    <aside v-if="open" class="lux-detached-drawer" :class="rootClass" role="region" :aria-label="title || ariaLabel"
      :style="{ width: `min(${maxWidth}, calc(100vw - 1rem))`, zIndex: zIndex < 2000 ? 2000 + zIndex : zIndex }">
      <slot />
    </aside>
  </Teleport>
</template>
