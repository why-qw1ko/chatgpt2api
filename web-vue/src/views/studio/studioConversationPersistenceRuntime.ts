import { type Ref, watch } from 'vue'
import { getStringPreference, preferenceKeys, removePreference, setStringPreference } from '@/lib/preferences'
import { useAuthStore } from '@/stores/auth'
import { scheduleIdleTask, type IdleTaskHandle } from '@/lib/idleTask'
import { saveStudioSessionState } from '@/api/studioSessions'
import type { StudioConversation, StudioConversationBadgeState } from '@/components/studio/types'
import {
  loadStudioConversationNotices,
  loadStudioConversations,
  persistStudioConversationNotices,
  persistStudioConversations,
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
  let conversationsTimer: number | null = null
  let conversationNoticesTimer: number | null = null
  let activeConversationTimer: number | null = null
  let conversationsIdleTask: IdleTaskHandle | null = null
  let conversationNoticesIdleTask: IdleTaskHandle | null = null
  let serverSyncTimer: number | null = null
  let serverSyncInFlight = false

  function scheduleServerSync() {
    if (serverSyncTimer !== null) return
    serverSyncTimer = window.setTimeout(() => {
      serverSyncTimer = null
      void syncToServer()
    }, 2500)
  }

  async function syncToServer() {
    if (serverSyncInFlight) {
      scheduleServerSync()
      return
    }
    serverSyncInFlight = true
    try {
      await saveStudioSessionState({
        conversations: input.conversations.value,
        conversationNotices: input.conversationNotices.value,
        activeConversationId: input.activeConversationId.value,
      })
    } catch {
      // 服务端不可用时保留本地缓存，下次变更再重试。
    } finally {
      serverSyncInFlight = false
    }
  }

  const stopConversationWatch = watch(input.conversations, scheduleConversations)
  const stopConversationNoticeWatch = watch(input.conversationNotices, scheduleConversationNotices)
  const stopActiveConversationWatch = watch(input.activeConversationId, scheduleActiveConversationId)

  function scheduleConversations() {
    if (conversationsTimer !== null) return
    conversationsTimer = window.setTimeout(() => {
      conversationsTimer = null
      conversationsIdleTask?.cancel()
      conversationsIdleTask = scheduleIdleTask(() => {
        conversationsIdleTask = null
        persistStudioConversations(input.conversations.value)
        scheduleServerSync()
      }, 1200)
    }, 300)
  }

  function scheduleConversationNotices() {
    if (conversationNoticesTimer !== null) return
    conversationNoticesTimer = window.setTimeout(() => {
      conversationNoticesTimer = null
      conversationNoticesIdleTask?.cancel()
      conversationNoticesIdleTask = scheduleIdleTask(() => {
        conversationNoticesIdleTask = null
        persistStudioConversationNotices(input.conversationNotices.value, input.validConversationIds.value)
        scheduleServerSync()
      }, 1200)
    }, 300)
  }

  function scheduleActiveConversationId() {
    if (activeConversationTimer !== null) {
      window.clearTimeout(activeConversationTimer)
    }
    activeConversationTimer = window.setTimeout(() => {
      activeConversationTimer = null
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
    persistStudioConversations(input.conversations.value)
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
    persistStudioConversationNotices(input.conversationNotices.value, input.validConversationIds.value)
  }

  function flushActiveConversationId() {
    if (activeConversationTimer !== null) {
      window.clearTimeout(activeConversationTimer)
      activeConversationTimer = null
    }
    setStringPreference(preferenceKeys.studioActiveConversationId, input.activeConversationId.value)
  }

  function flush() {
    if (conversationsTimer !== null || conversationsIdleTask) flushConversations()
    if (conversationNoticesTimer !== null || conversationNoticesIdleTask) flushConversationNotices()
    if (activeConversationTimer !== null) flushActiveConversationId()
    if (serverSyncTimer !== null) {
      window.clearTimeout(serverSyncTimer)
      serverSyncTimer = null
    }
    void syncToServer()
  }

  function dispose() {
    stopConversationWatch()
    stopConversationNoticeWatch()
    stopActiveConversationWatch()
    flush()
  }

  return {
    flush,
    scheduleConversationNotices,
    scheduleConversations,
    dispose,
  }
}
