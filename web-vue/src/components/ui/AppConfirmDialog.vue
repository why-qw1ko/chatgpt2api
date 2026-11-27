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
    @open-auto-focus="focusCancelButton"
    @keydown.capture="keepModalTabBoundary"
  >
    <p class="whitespace-pre-line break-words text-sm leading-7 text-muted-foreground">{{ message }}</p>
    <template #footer>
      <div class="flex flex-wrap justify-end gap-2">
        <Button ref="cancelButton" @click="emit('cancel')">{{ cancelText || '取消' }}</Button>
        <Button :variant="confirmVariant || 'primary'" @click="emit('confirm')">{{ confirmText || '确定' }}</Button>
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
import { ElDialog } from 'element-plus'
import { ref } from 'vue'
import Button from './Button.vue'
import { keepModalTabBoundary } from './modalKeyboard'
import { CloseIcon } from './icons'

const props = defineProps<{
  open: boolean
  title?: string
  message: string
  confirmText?: string
  confirmVariant?: 'primary' | 'danger'
  cancelText?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const cancelButton = ref<InstanceType<typeof Button> | null>(null)

function focusCancelButton() {
  // Element Plus focuses the dialog container on its next tick.
  requestAnimationFrame(() => {
    if (props.open) cancelButton.value?.focus()
  })
}
</script>
