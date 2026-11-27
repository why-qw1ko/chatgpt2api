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
            <StudioConversationStatus v-if="badges[conversation.id]" :badge="badges[conversation.id]" class="studio-mobile-history-status" />
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
import StudioConversationStatus from './StudioConversationStatus.vue'
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
  flex: 0 0 72px;
  padding-bottom: 0.25rem;
}

.studio-mobile-history-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid transparent;
  border-radius: var(--control-radius, 0.375rem);
  padding: 0.5rem 0.75rem;
}

.studio-mobile-history-item.is-active {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.studio-mobile-history-main {
  display: grid;
  min-width: 0;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: 'title status' 'meta status';
  align-items: center;
  gap: 0.25rem 0.5rem;
  text-align: left;
}

.studio-mobile-history-delete {
  width: 2rem;
  height: 2rem;
  flex: none;
}

.studio-mobile-history-delete:hover {
  color: hsl(var(--tone-error-foreground));
  background: hsl(var(--tone-error-bg));
}

.studio-mobile-history-title {
  grid-area: title;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25rem;
}

.studio-mobile-history-meta {
  grid-area: meta;
  font-size: 0.75rem;
  line-height: 1rem;
  color: hsl(var(--muted-foreground));
}

.studio-mobile-history-status { grid-area: status; }

</style>
