<template>
  <ElDialog
    :model-value="open"
    :title="title || '确认操作'"
    width="min(28rem, calc(100vw - 2rem))"
    :z-index="2300"
    :close-icon="CloseIcon"
    align-center append-to-body destroy-on-close
    class="lux-confirm-dialog"
    :before-close="() => emit('cancel')"
    @keydown.capture="keepModalTabBoundary"
  >
    <p class="whitespace-pre-line break-words text-sm leading-7 text-muted-foreground">{{ message }}</p>
    <template #footer>
      <ElButton @click="emit('cancel')">{{ cancelText || '取消' }}</ElButton>
      <ElButton type="primary" @click="emit('confirm')">{{ confirmText || '确定' }}</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
import { ElDialog, ElButton } from 'element-plus'
import { keepModalTabBoundary } from './modalKeyboard'
import { CloseIcon } from './icons'

defineProps<{
  open: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>
