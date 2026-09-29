<script setup lang="ts">
import { ref } from 'vue'
import { ElPopover, ElMenu } from 'element-plus'
import { Icon } from '@iconify/vue'
import Button from './Button.vue'
import MenuItems from './MenuItems.vue'
import type { ActionMenuItem, ButtonSize, MenuPlacement } from './types'
withDefaults(defineProps<{
  label: string; items: ActionMenuItem[]; disabled?: boolean; align?: 'left' | 'right'
  placement?: MenuPlacement; size?: ButtonSize; triggerVariant?: 'button' | 'input'
  triggerClass?: string; buttonClass?: string; contentClass?: string; menuClass?: string
  menuMinWidth?: number; triggerMinWidth?: number; triggerWidth?: number
}>(), { align: 'right', menuMinWidth: 180, size: 'sm' })
const emit = defineEmits<{ select: [key: string] }>()
const open = ref(false)
const trigger = ref<InstanceType<typeof Button>>()
const menu = ref<InstanceType<typeof ElMenu>>()
function focusMenu() { menu.value?.$el.querySelector('[role="menuitem"]:not(.is-disabled)')?.focus() }
function select(key: string) { open.value = false; trigger.value?.focus(); emit('select', key) }
function closeWithKeyboard() { open.value = false; trigger.value?.focus() }
function handleMenuKeydown(event: KeyboardEvent) {
  const root = menu.value?.$el as HTMLElement | undefined
  if (!root) return
  const items = Array.from(root.querySelectorAll<HTMLElement>('[role="menuitem"]'))
    .filter(item => !item.classList.contains('is-disabled') && item.getBoundingClientRect().height > 0)
  const current = items.findIndex(item => item === document.activeElement)
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    const item = items[current]
    if (item?.classList.contains('el-sub-menu')) item.querySelector<HTMLElement>('.el-sub-menu__title')?.click()
    else item?.click()
  } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) && items.length) {
    event.preventDefault()
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
    items[index]?.focus()
  } else if (event.key === 'Tab') {
    open.value = false
  }
}
</script>
<template>
  <ElPopover v-model:visible="open" trigger="click" :disabled="disabled"
    :placement="`${placement === 'up' || placement === 'top' ? 'top' : 'bottom'}-${align === 'right' ? 'end' : 'start'}`"
    :width="Math.max(menuMinWidth, 180)" popper-class="lux-action-popover" :show-arrow="false" @after-enter="focusMenu">
    <template #reference>
      <Button ref="trigger" :disabled="disabled" :size="size" :root-class="[triggerClass, buttonClass].filter(Boolean).join(' ')"
        :style="{ minWidth: triggerMinWidth ? `${triggerMinWidth}px` : undefined, width: triggerWidth ? `${triggerWidth}px` : undefined }"
        aria-haspopup="menu" :aria-expanded="open" @keydown.esc.stop.prevent="closeWithKeyboard" @keydown.down.prevent="open = true">
        {{ label }}<Icon icon="lucide:chevron-down" class="h-3.5 w-3.5 shrink-0" />
      </Button>
    </template>
    <ElMenu ref="menu" :class="[menuClass, contentClass]" class="lux-action-menu" @select="select" @keydown="handleMenuKeydown" @keydown.esc.stop.prevent="closeWithKeyboard">
      <MenuItems :items="items" />
    </ElMenu>
  </ElPopover>
</template>
