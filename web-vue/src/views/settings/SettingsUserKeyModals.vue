<template>
  <ModalShell
    :open="modal === 'create'"
    aria-label="创建用户密钥"
    :z-index="130"
    close-on-backdrop
    @close="$emit('close')"
  >
    <ModalHeader
      title="创建用户密钥"
      subtitle="密钥创建后只展示一次，请及时保存。"
      :close-disabled="busy === 'create'"
      :bordered="false"
      @close="$emit('close')"
    />
    <ModalBody class="space-y-3">
      <FormField label="名称">
        <Input v-model.trim="form.name" block placeholder="例如：运营画图账号" />
      </FormField>
      <FormField label="自定义密钥（可选）">
        <Input v-model.trim="form.key" block type="password" autocomplete="new-password" placeholder="留空则自动生成" />
      </FormField>
      <FormField label="每日图片上限（可选）">
        <Input v-model.trim="form.dailyImageLimit" block type="number" min="0" step="1" placeholder="留空表示不限，0 表示禁止生成" />
      </FormField>
    </ModalBody>
    <ModalFooter :bordered="false">
      <Button size="sm" variant="outline" :disabled="busy === 'create'" @click="$emit('close')">取消</Button>
      <Button size="sm" variant="primary" :disabled="busy === 'create'" @click="$emit('create')">
        {{ busy === 'create' ? '创建中...' : '创建' }}
      </Button>
    </ModalFooter>
  </ModalShell>

  <ModalShell
    :open="modal === 'edit'"
    aria-label="编辑用户密钥"
    :z-index="130"
    close-on-backdrop
    @close="$emit('close')"
  >
    <ModalHeader
      title="编辑用户密钥"
      subtitle="可以修改备注名称；填写新的专用密钥会让旧密钥失效。"
      :close-disabled="isEditBusy"
      :bordered="false"
      @close="$emit('close')"
    />
    <ModalBody class="space-y-3">
      <FormField label="名称">
        <Input v-model.trim="form.name" block placeholder="例如：运营画图账号" />
      </FormField>
      <FormField label="自定义新密钥（可选）">
        <Input v-model.trim="form.key" block type="password" autocomplete="new-password" placeholder="留空则保留当前密钥" />
      </FormField>
      <FormField label="每日图片上限（可选）">
        <Input v-model.trim="form.dailyImageLimit" block type="number" min="0" step="1" placeholder="留空表示不限，0 表示禁止生成" />
      </FormField>
    </ModalBody>
    <ModalFooter :bordered="false">
      <Button size="sm" variant="outline" :disabled="isEditBusy" @click="$emit('close')">取消</Button>
      <Button size="sm" variant="primary" :disabled="isEditBusy" @click="$emit('update')">
        {{ isEditBusy ? '保存中...' : '保存' }}
      </Button>
    </ModalFooter>
  </ModalShell>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Button, FormField, Input } from '@/components/ui'
import type { UserKey } from '@/api/userKeys'
import ModalBody from '@/components/ai/ModalBody.vue'
import ModalFooter from '@/components/ai/ModalFooter.vue'
import ModalHeader from '@/components/ai/ModalHeader.vue'
import ModalShell from '@/components/ai/ModalShell.vue'
import type { UserKeyForm } from '@/views/settings/settingsUserKeysRuntime'

const props = defineProps<{
  modal: 'create' | 'edit' | ''
  form: UserKeyForm
  editingUserKey: UserKey | null
  busy: string
}>()

defineEmits<{
  close: []
  create: []
  update: []
}>()

const isEditBusy = computed(() => Boolean(props.editingUserKey && props.busy === props.editingUserKey.id))
</script>
