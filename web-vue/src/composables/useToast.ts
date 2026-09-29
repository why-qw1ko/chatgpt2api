import { ElNotification, type NotificationHandle } from 'element-plus'
import { h } from 'vue'
import { Icon } from '@iconify/vue'
import { CloseIcon } from '@/components/ui/icons'

export type Toast = {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
}

let toastId = 0
const notifications = new Map<string, NotificationHandle>()
const toastIcons = { success: 'lucide:circle-check', error: 'lucide:circle-alert', warning: 'lucide:triangle-alert', info: 'lucide:info' } as const

export function showToast(options: Omit<Toast, 'id'>) {
  const id = 'toast-' + ++toastId
  const notification = ElNotification({
    title: options.title || '', message: options.message,
    icon: () => h(Icon, { icon: toastIcons[options.type], style: { color: `hsl(var(--tone-${options.type}-foreground))` } }),
    closeIcon: CloseIcon,
    duration: options.duration ?? 3000, position: 'top-right', offset: 20,
    onClose: () => notifications.delete(id),
  })
  notifications.set(id, notification)
  return id
}

export function removeToast(id: string) {
  notifications.get(id)?.close()
  notifications.delete(id)
}

export const useToast = () => ({
  success: (message: string, title?: string, duration?: number) => showToast({ type: 'success', message, title, duration }),
  error: (message: string, title?: string, duration?: number) => showToast({ type: 'error', message, title, duration }),
  warning: (message: string, title?: string, duration?: number) => showToast({ type: 'warning', message, title, duration }),
  info: (message: string, title?: string, duration?: number) => showToast({ type: 'info', message, title, duration }),
})
