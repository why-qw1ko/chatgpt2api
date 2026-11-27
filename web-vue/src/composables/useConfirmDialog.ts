import { ref } from 'vue'

type ConfirmOptions = {
  title?: string
  message: string
  confirmText?: string
  confirmVariant?: 'primary' | 'danger'
  cancelText?: string
}

// Global singleton state: all callers share the same dialog instance.
const open = ref(false)
const title = ref('确认操作')
const message = ref('')
const confirmText = ref('确定')
const confirmVariant = ref<NonNullable<ConfirmOptions['confirmVariant']>>('primary')
const cancelText = ref('取消')
let resolver: ((value: boolean) => void) | null = null

export function useConfirmDialog() {
  const ask = (options: ConfirmOptions) =>
    new Promise<boolean>((resolve) => {
      title.value = options.title || '确认操作'
      message.value = options.message
      confirmText.value = options.confirmText || '确定'
      confirmVariant.value = options.confirmVariant ?? 'primary'
      cancelText.value = options.cancelText || '取消'
      open.value = true
      resolver = resolve
    })

  const confirm = () => {
    open.value = false
    resolver?.(true)
    resolver = null
  }

  const cancel = () => {
    open.value = false
    resolver?.(false)
    resolver = null
  }

  return {
    open,
    title,
    message,
    confirmText,
    confirmVariant,
    cancelText,
    ask,
    confirm,
    cancel,
  }
}
