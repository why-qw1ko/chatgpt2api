<script setup lang="ts">
import { ElMenuItem, ElMenuItemGroup, ElSubMenu } from 'element-plus'
import { ChevronDownIcon, ChevronUpIcon } from './icons'
import type { ActionMenuItem } from './types'
defineProps<{ items: ActionMenuItem[] }>()
</script>
<template>
  <template v-for="item in items" :key="item.key">
    <ElMenuItemGroup v-if="item.heading" :title="item.label" />
    <ElSubMenu v-else-if="item.children?.length" :index="item.key" :disabled="item.disabled" :expand-close-icon="ChevronDownIcon" :expand-open-icon="ChevronUpIcon">
      <template #title>{{ item.label }}</template>
      <MenuItems :items="item.children" />
    </ElSubMenu>
    <ElMenuItem v-else :index="item.key" :disabled="item.disabled"
      :class="{ 'lux-menu-danger': item.danger, 'lux-menu-divider': item.dividerBefore, 'is-active': item.active }">
      {{ item.label }}
    </ElMenuItem>
  </template>
</template>
