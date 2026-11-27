import { type Ref, watch } from 'vue'
import { getAuthToken } from '@/api/client'
import { getStringPreference, preferenceKeys, removePreference, setStringPreference } from '@/lib/preferences'
import { useAuthStore } from '@/stores/auth'
import { scheduleIdleTask, type IdleTaskHandle } from '@/lib/idleTask'
import {
  clearStudioSessionState,
  deleteStudioConversation,
  loadStudioSessionState,
  saveStudioSessionState,
  type StudioSessionState,
} from '@/api/studioSessions'
import type { StudioConversation, StudioConversationBadgeState } from '@/components/studio/types'
import {
  loadStudioConversationNotices,
  loadStudioConversations,
  persistStudioConversationNotices,
  persistStudioConversations,
  studioMessageForPersistence,
} from './studioConversationState'

type StudioConversationIdSetRef = {
  value: Set<string>
}

export type StudioConversationPersistenceRuntimeInput = {
  conversations: Ref<StudioConversation[]>
  conversationNotices: Ref<Record<string, StudioConversationBadgeState>>
  activeConversationId: Ref<string>
  validConversationIds: StudioConversationIdSetRef
}

export function loadStudioConversationPersistenceState() {
  const authStore = useAuthStore()
  const currentOwner = authStore.subject?.id || ''
  const storedOwner = getStringPreference(preferenceKeys.studioOwnerKey, '')
  if (currentOwner && storedOwner && currentOwner !== storedOwner) {
    removePreference(preferenceKeys.studioConversations)
    removePreference(preferenceKeys.studioActiveConversationId)
    removePreference(preferenceKeys.studioConversationBadges)
    removePreference(preferenceKeys.imageTaskLocalIds)
    removePreference(preferenceKeys.imageTaskConversations)
    setStringPreference(preferenceKeys.studioOwnerKey, currentOwner)
    return {
      activeConversationId: '',
      conversationNotices: {},
      conversations: [],
    }
  }
  if (currentOwner && !storedOwner) {
    setStringPreference(preferenceKeys.studioOwnerKey, currentOwner)
  }
  return {
    activeConversationId: getStringPreference(preferenceKeys.studioActiveConversationId, ''),
    conversationNotices: loadStudioConversationNotices(),
    conversations: loadStudioConversations(),
  }
}

export type StudioConversationPersistenceRuntime = ReturnType<typeof useStudioConversationPersistenceRuntime>

export function useStudioConversationPersistenceRuntime(input: StudioConversationPersistenceRuntimeInput) {
  const sessionToken = getAuthToken()
  let disposed = false
  let conversationsTimer: number | null = null
  let conversationNoticesTimer: number | null = null
  let activeConversationTimer: number | null = null
  let conversationsIdleTask: IdleTaskHandle | null = null
  let conversationNoticesIdleTask: IdleTaskHandle | null = null
  let serverSyncTimer: number | null = null
  let serverSyncInFlight: Promise<void> | null = null
  let serverMutationInFlight = false
  let serverMutationQueue: Promise<void> = Promise.resolve()

  function isCurrentSession() {
    return !disposed && Boolean(sessionToken) && getAuthToken() === sessionToken
  }

  function scheduleServerSync() {
    if (!isCurrentSession() || serverSyncTimer !== null) return
    serverSyncTimer = window.setTimeout(() => {
      serverSyncTimer = null
      void syncToServer()
    }, 2500)
  }

  async function syncToServer() {
    if (!isCurrentSession()) return
    if (serverMutationInFlight) {
      scheduleServerSync()
      return
    }
    if (serverSyncInFlight) {
      scheduleServerSync()
      return serverSyncInFlight
    }
    const pending = saveSnapshot()
    serverSyncInFlight = pending
    try {
      await pending
    } finally {
      serverSyncInFlight = null
    }
  }

  function saveSnapshot() {
    return saveStudioSessionState({
      conversations: input.conversations.value.map((item) => {
        const { messageTombstones, ...conversation } = item
        return { ...conversation, messages: [...item.messages, ...(messageTombstones || [])].map(studioMessageForPersistence) }
      }),
      conversationNotices: input.conversationNotices.value,
      activeConversationId: input.activeConversationId.value,
    }, sessionToken).catch(() => {
      // 服务端不可用时保留本地缓存，下次变更再重试。
    })
  }

  function runServerMutation(action: () => Promise<void>): Promise<void> {
    const pending = serverMutationQueue.then(async () => {
      serverMutationInFlight = true
      clearServerSyncTimer()
      try {
        if (serverSyncInFlight) await serverSyncInFlight
        if (!isCurrentSession()) throw new Error('登录状态已变化，请刷新页面后继续。')
        await action()
      } finally {
        serverMutationInFlight = false
        scheduleServerSync()
      }
    })
    serverMutationQueue = pending.catch(() => {})
    return pending
  }

  async function removeConversation(conversationId: string) {
    if (!conversationId) return
    await runServerMutation(() => deleteStudioConversation(conversationId, sessionToken))
  }

  async function clearAllConversations() {
    await runServerMutation(() => clearStudioSessionState(sessionToken))
  }

  const stopConversationWatch = watch(input.conversations, scheduleConversations)
  const stopConversationNoticeWatch = watch(input.conversationNotices, scheduleConversationNotices)
  const stopActiveConversationWatch = watch(input.activeConversationId, scheduleActiveConversationId)

  function scheduleConversations() {
    if (!isCurrentSession() || conversationsTimer !== null) return
    conversationsTimer = window.setTimeout(() => {
      conversationsTimer = null
      conversationsIdleTask?.cancel()
      conversationsIdleTask = scheduleIdleTask(() => {
        conversationsIdleTask = null
        if (!isCurrentSession()) return
        persistStudioConversations(input.conversations.value)
        scheduleServerSync()
      }, 1200)
    }, 300)
  }

  function scheduleConversationNotices() {
    if (!isCurrentSession() || conversationNoticesTimer !== null) return
    conversationNoticesTimer = window.setTimeout(() => {
      conversationNoticesTimer = null
      conversationNoticesIdleTask?.cancel()
      conversationNoticesIdleTask = scheduleIdleTask(() => {
        conversationNoticesIdleTask = null
        if (!isCurrentSession()) return
        persistStudioConversationNotices(input.conversationNotices.value, input.validConversationIds.value)
        scheduleServerSync()
      }, 1200)
    }, 300)
  }

  function scheduleActiveConversationId() {
    if (!isCurrentSession()) return
    if (activeConversationTimer !== null) {
      window.clearTimeout(activeConversationTimer)
    }
    activeConversationTimer = window.setTimeout(() => {
      activeConversationTimer = null
      if (!isCurrentSession()) return
      setStringPreference(preferenceKeys.studioActiveConversationId, input.activeConversationId.value)
      scheduleServerSync()
    }, 200)
  }

  function flushConversations() {
    if (conversationsTimer !== null) {
      window.clearTimeout(conversationsTimer)
      conversationsTimer = null
    }
    if (conversationsIdleTask) {
      conversationsIdleTask.flush()
      conversationsIdleTask = null
      return
    }
    if (isCurrentSession()) persistStudioConversations(input.conversations.value)
  }

  function flushConversationNotices() {
    if (conversationNoticesTimer !== null) {
      window.clearTimeout(conversationNoticesTimer)
      conversationNoticesTimer = null
    }
    if (conversationNoticesIdleTask) {
      conversationNoticesIdleTask.flush()
      conversationNoticesIdleTask = null
      return
    }
    if (isCurrentSession()) {
      persistStudioConversationNotices(input.conversationNotices.value, input.validConversationIds.value)
    }
  }

  function flushActiveConversationId() {
    if (activeConversationTimer !== null) {
      window.clearTimeout(activeConversationTimer)
      activeConversationTimer = null
    }
    if (isCurrentSession()) setStringPreference(preferenceKeys.studioActiveConversationId, input.activeConversationId.value)
  }

  function clearServerSyncTimer() {
    if (serverSyncTimer === null) return
    window.clearTimeout(serverSyncTimer)
    serverSyncTimer = null
  }

  function flushLocalWrites() {
    if (conversationsTimer !== null || conversationsIdleTask) flushConversations()
    if (conversationNoticesTimer !== null || conversationNoticesIdleTask) flushConversationNotices()
    if (activeConversationTimer !== null) flushActiveConversationId()
    clearServerSyncTimer()
  }

  function flush() {
    flushLocalWrites()
    void syncToServer()
  }

  function dispose() {
    stopConversationWatch()
    stopConversationNoticeWatch()
    stopActiveConversationWatch()
    const shouldSave = isCurrentSession() && (
      conversationsTimer !== null || conversationNoticesTimer !== null || activeConversationTimer !== null
      || conversationsIdleTask !== null || conversationNoticesIdleTask !== null || serverSyncTimer !== null
      || serverMutationInFlight
    )
    flushLocalWrites()
    disposed = true
    if (shouldSave) {
      void Promise.all([serverMutationQueue, serverSyncInFlight]).then(() => {
        if (getAuthToken() === sessionToken) return saveSnapshot()
      })
    }
  }

  return {
    clearAllConversations,
    flush,
    isCurrentSession,
    loadSession: () => loadStudioSessionState(sessionToken),
    syncTombstones: (state: StudioSessionState) => runServerMutation(() => saveStudioSessionState(state, sessionToken)),
    removeConversation,
    scheduleConversationNotices,
    scheduleConversations,
    dispose,
  }
}
