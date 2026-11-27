import { onDeactivated, onScopeDispose, ref } from 'vue'

import { userKeysApi, type UserKey, type UserKeyUpdatePayload } from '@/api/userKeys'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import type { usePageRuntime } from '@/composables/usePageRuntime'
import { usePageQuery } from '@/composables/usePageQuery'
import { useToast } from '@/composables/useToast'
import { errorMessage } from '@/lib/errorMessage'
import { writeClipboardText } from '@/lib/clipboard'

export type UserKeyForm = {
  name: string
  key: string
  dailyImageLimit: string
}

type SettingsUserKeysRuntimeOptions = {
  runtime: ReturnType<typeof usePageRuntime>
  requestKey: string
}

function createUserKeyForm(): UserKeyForm {
  return { name: '', key: '', dailyImageLimit: '' }
}

function parseDailyImageLimit(value: string): number | null | undefined {
  const text = value.trim()
  if (!text) return null
  const limit = Number(text)
  return Number.isSafeInteger(limit) && limit >= 0 ? limit : undefined
}

export function useSettingsUserKeysRuntime(options: SettingsUserKeysRuntimeOptions) {
  const userKeys = ref<UserKey[]>([])
  const userKeysLoaded = ref(false)
  const userKeysLoading = ref(false)
  const userKeyBusy = ref('')
  const userKeyModal = ref<'create' | 'edit' | ''>('')
  const editingUserKey = ref<UserKey | null>(null)
  const newUserKey = ref('')
  const userKeyForm = ref<UserKeyForm>(createUserKeyForm())
  const toast = useToast()
  const confirmDialog = useConfirmDialog()
  let rawKeyClearTimer: ReturnType<typeof window.setTimeout> | null = null

  function clearNewUserKey() {
    if (rawKeyClearTimer !== null) {
      window.clearTimeout(rawKeyClearTimer)
      rawKeyClearTimer = null
    }
    newUserKey.value = ''
  }

  function revealNewUserKey(rawKey: string) {
    clearNewUserKey()
    if (!rawKey || !options.runtime.isActive.value) return
    newUserKey.value = rawKey
    rawKeyClearTimer = window.setTimeout(clearNewUserKey, 120000)
  }

  function upsertUserKey(item: UserKey) {
    const previous = userKeys.value.find(candidate => candidate.id === item.id)
    if (!previous) {
      userKeys.value = [...userKeys.value, item]
      return
    }
    const imageUsage = item.daily_image_limit === previous.daily_image_limit ? previous.image_usage : undefined
    const updated = { ...item, image_usage: item.image_usage ?? imageUsage }
    userKeys.value = userKeys.value.map(candidate => candidate.id === item.id ? updated : candidate)
  }

  onDeactivated(clearNewUserKey)
  onScopeDispose(clearNewUserKey)

  const userKeysQuery = usePageQuery({
    runtime: options.runtime,
    key: options.requestKey,
    loading: userKeysLoading,
    errorMessage: '加载用户密钥失败',
  })

  async function copyUserKey(value: string) {
    if (!value) return
    try {
      await writeClipboardText(value)
      if (value === newUserKey.value) clearNewUserKey()
      toast.success('已复制密钥')
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  function resetUserKeyForm() {
    userKeyForm.value = createUserKeyForm()
    editingUserKey.value = null
  }

  function openUserKeyCreateModal() {
    if (userKeyBusy.value) return
    clearNewUserKey()
    resetUserKeyForm()
    userKeyModal.value = 'create'
  }

  function openUserKeyEditModal(item: UserKey) {
    if (userKeyBusy.value) return
    editingUserKey.value = item
    userKeyForm.value = {
      name: item.name || '',
      key: '',
      dailyImageLimit: item.daily_image_limit != null ? String(item.daily_image_limit) : '',
    }
    userKeyModal.value = 'edit'
  }

  function closeUserKeyModal() {
    if (userKeyBusy.value === 'create') return
    if (editingUserKey.value && userKeyBusy.value === editingUserKey.value.id) return
    userKeyModal.value = ''
    resetUserKeyForm()
  }

  async function loadUserKeys() {
    if (!options.runtime.canRun.value) return
    await userKeysQuery.run(
      () => userKeysApi.list(),
      {
        apply: (response) => {
          userKeys.value = Array.isArray(response.items) ? response.items : []
          userKeysLoaded.value = true
        },
      },
    )
  }

  async function createUserKey() {
    if (userKeyBusy.value) return
    const dailyImageLimit = parseDailyImageLimit(userKeyForm.value.dailyImageLimit)
    if (dailyImageLimit === undefined) {
      toast.error('每日图片上限请输入大于或等于 0 的整数')
      return
    }
    const key = userKeyForm.value.key.trim()
    userKeyBusy.value = 'create'
    try {
      const response = await userKeysApi.create({
        name: userKeyForm.value.name.trim(),
        daily_image_limit: dailyImageLimit,
        ...(key ? { key } : {}),
      })
      upsertUserKey(response.item)
      revealNewUserKey(response.raw_key)
      toast.success('用户密钥已创建')
      userKeyModal.value = ''
      resetUserKeyForm()
      await loadUserKeys()
    } catch (error) {
      toast.error(errorMessage(error, '创建用户密钥失败'))
    } finally {
      userKeyBusy.value = ''
    }
  }

  async function updateUserKey() {
    const item = editingUserKey.value
    if (!item || userKeyBusy.value) return
    const nextName = userKeyForm.value.name.trim()
    const nextKey = userKeyForm.value.key.trim()
    const nextDailyLimit = parseDailyImageLimit(userKeyForm.value.dailyImageLimit)
    if (nextDailyLimit === undefined) {
      toast.error('每日图片上限请输入大于或等于 0 的整数')
      return
    }
    const updates: UserKeyUpdatePayload = {}
    if (nextName !== item.name) updates.name = nextName
    if (nextKey) updates.key = nextKey
    if (nextDailyLimit !== (item.daily_image_limit ?? null)) updates.daily_image_limit = nextDailyLimit
    if (!Object.keys(updates).length) {
      closeUserKeyModal()
      return
    }

    userKeyBusy.value = item.id
    try {
      const response = await userKeysApi.update(item.id, updates)
      upsertUserKey(response.item)
      toast.success('用户密钥已更新')
      userKeyModal.value = ''
      resetUserKeyForm()
      await loadUserKeys()
    } catch (error) {
      toast.error(errorMessage(error, '更新用户密钥失败'))
    } finally {
      userKeyBusy.value = ''
    }
  }

  async function toggleUserKey(item: UserKey) {
    if (userKeyBusy.value) return
    userKeyBusy.value = item.id
    try {
      const response = await userKeysApi.update(item.id, { enabled: !item.enabled })
      upsertUserKey(response.item)
      toast.success(item.enabled ? '用户密钥已禁用' : '用户密钥已启用')
      await loadUserKeys()
    } catch (error) {
      toast.error(errorMessage(error, '更新用户密钥失败'))
    } finally {
      userKeyBusy.value = ''
    }
  }

  async function rotateUserKey(item: UserKey) {
    if (userKeyBusy.value || confirmDialog.open.value) return
    const confirmed = await confirmDialog.ask({
      title: '轮换用户密钥',
      message: `将为「${item.name || item.id}」生成新密钥，旧密钥将失效。请准备更新使用旧密钥的客户端。`,
      confirmText: '生成新密钥',
      confirmVariant: 'danger',
    })
    if (!confirmed || userKeyBusy.value) return

    userKeyBusy.value = item.id
    try {
      const response = await userKeysApi.rotate(item.id)
      upsertUserKey(response.item)
      revealNewUserKey(response.raw_key)
      toast.success('用户密钥已轮换')
      await loadUserKeys()
    } catch (error) {
      toast.error(errorMessage(error, '轮换用户密钥失败'))
    } finally {
      userKeyBusy.value = ''
    }
  }

  async function deleteUserKey(item: UserKey) {
    if (userKeyBusy.value || confirmDialog.open.value) return
    const confirmed = await confirmDialog.ask({
      title: '删除用户密钥',
      message: `确定删除用户密钥「${item.name || item.id}」吗？删除后这条密钥将无法继续调用接口。`,
      confirmText: '删除',
      cancelText: '取消',
    })
    if (!confirmed || userKeyBusy.value) return

    userKeyBusy.value = item.id
    try {
      const response = await userKeysApi.delete(item.id)
      userKeys.value = userKeys.value.filter(candidate => candidate.id !== response.deleted_id)
      if (editingUserKey.value?.id === item.id) {
        userKeyModal.value = ''
        resetUserKeyForm()
      }
      toast.success('用户密钥已删除')
      await loadUserKeys()
    } catch (error) {
      toast.error(errorMessage(error, '删除用户密钥失败'))
    } finally {
      userKeyBusy.value = ''
    }
  }

  function invalidate() {
    clearNewUserKey()
    userKeysQuery.invalidate()
    userKeysLoaded.value = false
  }

  return {
    userKeys,
    userKeysLoaded,
    userKeysLoading,
    userKeysError: userKeysQuery.error,
    userKeyBusy,
    userKeyModal,
    editingUserKey,
    newUserKey,
    userKeyForm,
    clearNewUserKey,
    copyUserKey,
    resetUserKeyForm,
    openUserKeyCreateModal,
    openUserKeyEditModal,
    closeUserKeyModal,
    loadUserKeys,
    createUserKey,
    updateUserKey,
    toggleUserKey,
    rotateUserKey,
    deleteUserKey,
    invalidate,
  }
}
