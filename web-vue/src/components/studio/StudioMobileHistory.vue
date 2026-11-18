<template>
  <DrawerShell :open="open" title="对话历史" max-width="24rem" :z-index="260" @close="$emit('close')">
    <div ref="historyListRef" class="studio-mobile-history-list custom-scrollbar" @scroll="handleWindowScroll">
      <div
        v-if="topSpacerHeight > 0"
        class="studio-mobile-history-window-spacer"
        :style="{ height: `${topSpacerHeight}px` }"
        aria-hidden="true"
      ></div>
      <div
        v-for="{ item: conversation } in visibleConversationEntries"
        :key="conversation.id"
        class="studio-mobile-history-window-row"
        :style="{ height: `${historyRowHeight(conversation)}px` }"
      >
        <div
          class="studio-mobile-history-item"
          :class="{ 'is-active': conversation.id === activeConversationId }"
        >
          <button
            type="button"
            class="studio-mobile-history-main"
            :aria-current="conversation.id === activeConversationId ? 'true' : undefined"
            @click="$emit('select', conversation.id); $emit('close')"
          >
            <span class="studio-mobile-history-title">{{ conversation.title || '未命名对话' }}</span>
            <span class="studio-mobile-history-meta">
              {{ conversation.messages.length }} 条 · {{ formatTime(conversation.updatedAt) }}
            </span>
            <span
              v-if="badges[conversation.id]"
              class="studio-mobile-history-badge"
              :class="`is-${badges[conversation.id].state}`"
            >
              {{ badges[conversation.id].label }}
            </span>
          </button>
          <button
            type="button"
            class="studio-mobile-history-delete"
            title="删除对话"
            aria-label="删除对话"
            @click.stop="$emit('delete', conversation.id)"
          >
            <Icon icon="lucide:trash-2" class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div
        v-if="bottomSpacerHeight > 0"
        class="studio-mobile-history-window-spacer"
        :style="{ height: `${bottomSpacerHeight}px` }"
        aria-hidden="true"
      ></div>
      <p v-if="!conversations.length" class="studio-mobile-history-empty">暂无对话记录</p>
    </div>
  </DrawerShell>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, nextTick, ref, watch } from 'vue'
import { DrawerShell } from '@/components/ui'
import { useWindowedList } from '@/composables/useWindowedList'
import type { StudioConversation, StudioConversationBadge } from './types'

const props = defineProps<{
  open: boolean
  conversations: StudioConversation[]
  activeConversationId: string
  badges: Record<string, StudioConversationBadge>
}>()

defineEmits<{
  close: []
  select: [id: string]
  delete: [id: string]
}>()

const historyTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})
const historyListRef = ref<HTMLElement | null>(null)
const shouldWindowHistory = computed(() => props.open && props.conversations.length > 36)
const historyRowHeight = (conversation: StudioConversation) => props.badges[conversation.id] ? 96 : 72
const {
  visibleItems: visibleConversationEntries,
  topSpacerHeight,
  bottomSpacerHeight,
  handleScroll: handleWindowScroll,
  setScrollElement: setHistoryScrollElement,
  refreshWindow: refreshHistoryWindow,
} = useWindowedList({
  items: computed(() => props.conversations),
  itemHeight: 72,
  getItemHeight: historyRowHeight,
  overscan: 8,
  disabled: computed(() => !shouldWindowHistory.value),
})

watch(historyListRef, (element) => setHistoryScrollElement(element), { flush: 'post' })
watch(() => props.open, () => {
  void nextTick(refreshHistoryWindow)
})

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return historyTimeFormatter.format(date)
}
</script>

<style scoped>
.studio-mobile-history-delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  color: hsl(var(--muted-foreground));
}

.studio-mobile-history-list {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0.75rem;
}

.studio-mobile-history-empty {
  padding: 1rem;
  color: hsl(var(--muted-foreground));
  text-align: center;
  font-size: 0.875rem;
}

.studio-mobile-history-window-spacer {
  flex: 0 0 auto;
  min-height: 0;
  pointer-events: none;
}

.studio-mobile-history-window-row {
  display: flex;
  min-height: 0;
  flex: 0 0 auto;
  padding-bottom: 0.25rem;
}

.studio-mobile-history-item {
  position: relative;
  width: 100%;
  border: 1px solid transparent;
  border-radius: var(--control-radius, 0.375rem);
  padding: 0.5rem 0.75rem;
}

.studio-mobile-history-item.is-active {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.studio-mobile-history-main {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  gap: 0.25rem;
  padding-right: 1.85rem;
  text-align: left;
}

.studio-mobile-history-delete {
  position: absolute;
  top: 0.5rem;
  right: 0.45rem;
  width: 2rem;
  height: 2rem;
}

.studio-mobile-history-delete:hover {
  color: hsl(var(--tone-error-foreground));
  background: hsl(var(--tone-error-bg));
}

.studio-mobile-history-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25rem;
}

.studio-mobile-history-meta {
  font-size: 0.75rem;
  line-height: 1rem;
  color: hsl(var(--muted-foreground));
}

.studio-mobile-history-badge {
  width: fit-content;
  border-radius: 999px;
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1rem;
}

.studio-mobile-history-badge.is-running {
  background: hsl(var(--tone-info-bg));
  color: hsl(var(--tone-info-foreground));
}

.studio-mobile-history-badge.is-done {
  background: hsl(var(--tone-success-bg));
  color: hsl(var(--tone-success-foreground));
}

.studio-mobile-history-badge.is-error {
  background: hsl(var(--tone-error-bg));
  color: hsl(var(--tone-error-foreground));
}

.studio-mobile-history-badge.is-expired {
  background: hsl(var(--tone-warning-bg));
  color: hsl(var(--tone-warning-foreground));
}
</style>
