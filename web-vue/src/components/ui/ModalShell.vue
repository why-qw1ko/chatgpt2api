<script setup lang="ts">
import { ElDialog } from 'element-plus'
import { keepModalTabBoundary } from './modalKeyboard'
import { CloseIcon } from './icons'
withDefaults(defineProps<{
  open: boolean; title?: string; description?: string; maxWidth?: string; zIndex?: number
  closeOnOverlay?: boolean; closeOnEscape?: boolean; ariaLabel?: string; bare?: boolean
  rootClass?: string; panelClass?: string; overlayClass?: string; sizeClass?: string
  align?: 'center' | 'start'; placement?: 'center' | 'end'; showClose?: boolean
}>(), { maxWidth: '40rem', zIndex: 120, closeOnOverlay: true, closeOnEscape: undefined, align: 'center', showClose: true })
const emit = defineEmits<{ close: [] }>()
</script>
<template>
  <ElDialog :model-value="open" :title="title || ariaLabel" :width="`min(${maxWidth}, calc(100vw - 2rem))`"
    :z-index="zIndex < 2000 ? 2000 + zIndex : zIndex" :align-center="align === 'center'" top="1rem"
    :show-close="!bare && showClose" :close-icon="CloseIcon" :close-on-click-modal="closeOnOverlay"
    :close-on-press-escape="closeOnEscape ?? closeOnOverlay" append-to-body destroy-on-close
    :modal-class="overlayClass" class="lux-dialog" :class="[{ 'lux-dialog--bare': bare }, sizeClass]" :before-close="() => emit('close')" @keydown.capture="keepModalTabBoundary">
    <div :class="['lux-dialog-content', rootClass, panelClass]">
      <p v-if="description" class="mb-4 text-sm text-muted-foreground">{{ description }}</p>
      <slot />
    </div>
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </ElDialog>
</template>
