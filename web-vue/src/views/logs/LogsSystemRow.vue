<template>
  <tr
    v-memo="[signature]"
    class="log-row border-t border-border"
    :class="{ 'bg-primary/5': selected, 'log-row--with-details': hasDetails }"
    :aria-selected="selected || undefined"
  >
    <td class="pl-4 pr-2">
      <div class="log-cell-content">
        <div class="log-cell-primary">
          <Checkbox :model-value="selected" @update:model-value="handleSelect">
            <span class="sr-only">选择日志 {{ item.time || item.id }}</span>
          </Checkbox>
        </div>
      </div>
    </td>
    <td class="pr-5 text-xs">
      <div class="log-cell-content">
        <p class="log-cell-primary whitespace-nowrap text-foreground">{{ timeDisplay.primary }}</p>
        <p v-if="timeDisplay.secondary" class="log-cell-detail">{{ timeDisplay.secondary }}</p>
      </div>
    </td>
    <td class="pr-5">
      <div class="log-cell-content">
        <p class="log-cell-primary gap-1.5 text-xs text-foreground" :title="[request.kind, request.primary].filter(Boolean).join(' ')">
          <span v-if="request.kind" class="shrink-0 text-muted-foreground">{{ request.kind }}</span>
          <span class="truncate font-medium">{{ request.primary || '-' }}</span>
        </p>
        <p v-if="request.secondary" class="log-cell-detail" :title="request.secondary">{{ request.secondary }}</p>
      </div>
    </td>
    <td class="pr-5">
      <div class="log-cell-content">
        <p class="log-cell-primary text-xs text-foreground" :title="execution.primary">
          <span class="truncate">{{ execution.primary || '-' }}</span>
        </p>
        <div v-if="execution.secondary || item.accountSwitchCount" class="flex min-w-0 items-center gap-1.5">
          <span v-if="execution.secondary" class="log-cell-detail" :title="execution.secondary">{{ execution.secondary }}</span>
          <MetaChip v-if="item.accountSwitchCount" size="xs" tone="warning" chip-class="shrink-0 whitespace-nowrap">
            切换 {{ item.accountSwitchCount }} 次
          </MetaChip>
        </div>
      </div>
    </td>
    <td class="pr-5">
      <div class="log-cell-content">
        <p class="log-cell-primary font-mono text-xs tabular-nums text-foreground" :title="item.presentation.result.resolution">
          <span class="truncate">{{ item.presentation.result.resolution || '-' }}</span>
        </p>
      </div>
    </td>
    <td class="pr-5 text-xs text-muted-foreground">
      <div class="log-cell-content" :title="[durationDisplay.total, durationDisplay.breakdown].filter(Boolean).join(' ')">
        <div class="log-cell-primary">
          <MetaChip
            v-if="durationDisplay.total"
            radius="rounded"
            :tone="durationTone"
            :bordered="false"
            chip-class="font-mono tabular-nums whitespace-nowrap"
          >
            <Icon icon="lucide:clock-3" aria-hidden="true" />
            <span>{{ durationDisplay.total }}</span>
          </MetaChip>
          <span v-else>-</span>
        </div>
        <p
          v-if="durationDisplay.breakdown"
          class="log-cell-detail"
        >
          {{ durationDisplay.breakdown }}
        </p>
      </div>
    </td>
    <td class="pr-5">
      <LogImagePreviewCell
        :image-urls="item.imageUrls"
        :first-image-broken="firstImageBroken"
        :alt="item.preview || '日志结果图片'"
        @preview-click="handleOpenDetail"
        @image-error="handleImageError"
      />
    </td>
    <td class="pr-5">
      <div class="log-cell-content">
        <div class="log-cell-primary gap-2">
          <StateBadge :tone="statusTone(item)" shape="rounded" :bordered="false" class="shrink-0 whitespace-nowrap">
            {{ statusLabel(item) }}
          </StateBadge>
          <p
            class="min-w-0 truncate text-xs font-medium"
            :class="failed ? 'text-tone-error' : 'text-foreground'"
            :title="outcome"
          >
            {{ outcome }}
          </p>
        </div>
        <p
          v-if="diagnostics"
          class="log-cell-detail"
          :title="diagnostics"
        >
          {{ diagnostics }}
        </p>
      </div>
    </td>
    <td class="pr-4 text-right">
      <div class="log-cell-content">
        <div class="log-cell-primary justify-end gap-1.5">
          <Button
            size="xs"
            variant="outline"
            @click="handleOpenDetail"
          >
            查看详情
          </Button>
          <Button
            size="xs"
            variant="danger"
            @click="handleRequestDelete"
          >
            删除
          </Button>
        </div>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { Button, Checkbox } from '@/components/ui'
import LogImagePreviewCell from '@/components/ai/LogImagePreviewCell.vue'
import MetaChip from '@/components/ai/MetaChip.vue'
import StateBadge from '@/components/ai/StateBadge.vue'
import { type SystemLogRow } from '@/api/logs'
import {
  executionDisplay,
  logDurationDisplay,
  logDurationTone,
  outcomeText,
  requestDisplay,
  resultDiagnostics,
  statusLabel,
  statusTone,
} from '@/views/logs/logsView'

const props = defineProps<{
  item: SystemLogRow
  signature: string
  selected: boolean
  firstImageBroken: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-selection', id: string, checked: boolean): void
  (e: 'open-detail', item: SystemLogRow): void
  (e: 'request-delete-log', item: SystemLogRow): void
  (e: 'image-error', url: string): void
}>()

const request = computed(() => requestDisplay(props.item))
const execution = computed(() => executionDisplay(props.item))
const outcome = computed(() => outcomeText(props.item))
const failed = computed(() => props.item.presentation.is_failure)
const durationDisplay = computed(() => logDurationDisplay(props.item))
const durationTone = computed(() => {
  const tone = logDurationTone(props.item)
  return tone === 'success' || tone === 'info' ? 'muted' : tone
})
const diagnostics = computed(() => resultDiagnostics(props.item))
const timeDisplay = computed(() => {
  const value = props.item.time.trim()
  const match = value.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/)
  if (!match) return { primary: value || '-', secondary: '' }
  return { primary: match[2], secondary: match[1] }
})
const hasDetails = computed(() => Boolean(
  timeDisplay.value.secondary || request.value.secondary || execution.value.secondary || props.item.accountSwitchCount
  || durationDisplay.value.breakdown || diagnostics.value,
))

function handleSelect(checked: boolean | string | number) {
  emit('toggle-selection', props.item.id, Boolean(checked))
}

function handleOpenDetail() {
  emit('open-detail', props.item)
}

function handleRequestDelete() {
  emit('request-delete-log', props.item)
}

function handleImageError(url: string) {
  emit('image-error', url)
}
</script>

<style scoped>
.log-row > td {
  padding-block: 12px;
  vertical-align: middle;
}

.log-row--with-details { --log-detail-height: 1.25rem; }

.log-cell-content {
  display: grid;
  grid-template-rows: var(--workspace-control-compact) var(--log-detail-height, 0);
  grid-template-columns: minmax(0, 1fr);
}

.log-cell-primary {
  display: flex;
  min-width: 0;
  align-items: center;
}

.log-cell-detail {
  align-self: center;
  overflow: hidden;
  color: hsl(var(--muted-foreground));
  font-size: 0.75rem;
  line-height: 1rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
