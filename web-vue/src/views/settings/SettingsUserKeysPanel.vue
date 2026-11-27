<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="ui-section-title">用户密钥管理</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" :disabled="userKeysLoading || Boolean(userKeyBusy)" @click="$emit('load')">
          {{ userKeysLoading ? '刷新中...' : '刷新' }}
        </Button>
        <Button size="sm" variant="primary" :disabled="Boolean(userKeyBusy)" @click="$emit('create')">
          创建用户密钥
        </Button>
      </div>
    </div>

    <div
      v-if="newUserKey"
      class="rounded-xl border border-primary/20 bg-secondary px-4 py-3 text-sm text-secondary-foreground"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="font-medium">新密钥只展示一次，请现在复制保存。</p>
          <p class="mt-2 break-all font-mono text-xs">{{ newUserKey }}</p>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <Button size="xs" variant="outline" @click="$emit('copy', newUserKey)">复制密钥</Button>
          <Button size="xs" variant="ghost" @click="$emit('dismiss-key')">关闭</Button>
        </div>
      </div>
    </div>

    <StateBlock v-if="userKeysError" role="alert" compact :description="userKeysError" />
    <PageLoadingState
      v-if="userKeysLoading && userKeys.length === 0"
      compact
      title="正在加载用户密钥"
      description="读取普通用户密钥列表。"
    />
    <StateBlock v-else-if="!userKeysError && userKeys.length === 0" compact dashed>
      暂无用户密钥。
    </StateBlock>
    <div v-else-if="userKeys.length" class="space-y-2">
      <div
        v-for="item in userKeys"
        :key="item.id"
        class="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 md:flex-row md:items-center md:justify-between"
      >
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <p class="truncate text-sm font-medium text-foreground">{{ item.name || '普通用户' }}</p>
            <StateBadge
              :tone="item.enabled ? 'accent' : 'muted'"
              size="xs"
              shape="rounded"
            >
              {{ item.enabled ? '已启用' : '已禁用' }}
            </StateBadge>
          </div>
          <p class="mt-1 text-xs text-muted-foreground">
            创建 {{ formatDateTime(item.created_at) }} · 最近使用 {{ formatDateTime(item.last_used_at) }}
          </p>
          <p v-if="item.image_usage" class="mt-1 text-xs text-muted-foreground">
            今日已用 {{ item.image_usage.used }} 张
            <template v-if="item.image_usage.reserved"> · 已预留 {{ item.image_usage.reserved }} 张</template>
            · 剩余 {{ item.image_usage.remaining == null ? '不限' : item.image_usage.remaining + ' 张' }}
            · 上限 {{ item.image_usage.limit == null ? '不限' : item.image_usage.limit + ' 张/天' }}
          </p>
          <p v-else-if="item.daily_image_limit != null" class="mt-1 text-xs text-muted-foreground">
            每日图片上限 {{ item.daily_image_limit }} 张
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Button :tag="RouterLink" :to="{ name: 'logs', query: { key_id: item.id } }" size="xs">
            调用记录
          </Button>
          <Button
            size="xs"
            variant="outline"
            :disabled="Boolean(userKeyBusy)"
            @click="$emit('edit', item)"
          >
            编辑
          </Button>
          <Button size="xs" :disabled="Boolean(userKeyBusy)" @click="$emit('rotate', item)">
            一键轮换
          </Button>
          <Button
            size="xs"
            variant="outline"
            :disabled="Boolean(userKeyBusy)"
            @click="$emit('toggle', item)"
          >
            {{ item.enabled ? '禁用' : '启用' }}
          </Button>
          <Button
            size="xs"
            variant="danger"
            :disabled="Boolean(userKeyBusy)"
            @click="$emit('delete', item)"
          >
            删除
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui'
import type { UserKey } from '@/api/userKeys'
import PageLoadingState from '@/components/ai/PageLoadingState.vue'
import StateBadge from '@/components/ai/StateBadge.vue'
import StateBlock from '@/components/ai/StateBlock.vue'
import { formatDateTime } from '@/views/settings/settingsView'

defineProps<{
  userKeys: UserKey[]
  userKeysLoading: boolean
  userKeysError: string
  userKeyBusy: string
  newUserKey: string
}>()

defineEmits<{
  load: []
  create: []
  copy: [value: string]
  'dismiss-key': []
  edit: [item: UserKey]
  rotate: [item: UserKey]
  toggle: [item: UserKey]
  delete: [item: UserKey]
}>()
</script>
