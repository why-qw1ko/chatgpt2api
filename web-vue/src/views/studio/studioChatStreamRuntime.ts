import { ref } from 'vue'
import type { StudioConversation, StudioConversationBadgeState, StudioMessage } from '@/components/studio/types'
import { streamStudioChatReply, studioErrorMessage, type StudioChatContextInput } from './studioRequestView'

export type StudioChatStreamRuntimeHooks = {
  touchConversation: (conversation: StudioConversation) => void
  scheduleScrollToBottom: () => void
  markConversationNotice: (conversationId: string, state: StudioConversationBadgeState) => void
}

export type StudioChatStreamInput = Omit<StudioChatContextInput, 'signal'> & {
  assistantMessage: StudioMessage
  model: string
  reasoningEffort: string
  isMessageRetained: (messageId: string) => boolean
  onContextNotice: (message: string) => void
}

export function useStudioChatStreamRuntime(hooks: StudioChatStreamRuntimeHooks) {
  const isStreaming = ref(false)
  let streamController: AbortController | null = null

  async function stream(input: StudioChatStreamInput) {
    const controller = new AbortController()
    streamController = controller
    isStreaming.value = true

    let pendingDelta = ''
    let deltaFrameId: number | null = null

    const flushPendingDelta = () => {
      if (deltaFrameId !== null) {
        window.cancelAnimationFrame(deltaFrameId)
        deltaFrameId = null
      }
      if (!pendingDelta) return
      input.assistantMessage.content += pendingDelta
      pendingDelta = ''
      hooks.touchConversation(input.conversation)
      hooks.scheduleScrollToBottom()
    }

    const scheduleDeltaFlush = (delta: string) => {
      pendingDelta += delta
      if (deltaFrameId !== null) return
      deltaFrameId = window.requestAnimationFrame(() => {
        deltaFrameId = null
        flushPendingDelta()
      })
    }

    try {
      const submitted = await streamStudioChatReply({
        ...input,
        signal: controller.signal,
        canSubmit: () => input.isMessageRetained(input.questionId)
          && input.isMessageRetained(input.assistantMessage.id),
        handlers: {
          onDelta: scheduleDeltaFlush,
        },
      })
      if (!submitted) return 'discarded'
      flushPendingDelta()
      if (!input.conversation.messages.some((message) => message.id === input.assistantMessage.id)) return
      input.assistantMessage.status = 'done'
      if (!input.assistantMessage.content.trim()) input.assistantMessage.content = '上游没有返回内容。'
      hooks.markConversationNotice(input.conversation.id, 'done')
    } catch (error) {
      flushPendingDelta()
      if (!input.conversation.messages.some((message) => message.id === input.assistantMessage.id)) return
      if (controller.signal.aborted) {
        input.assistantMessage.status = 'done'
        if (!input.assistantMessage.content.trim()) input.assistantMessage.content = '已停止。'
        hooks.markConversationNotice(input.conversation.id, 'done')
        return
      }
      const message = studioErrorMessage(error, '对话请求失败')
      input.assistantMessage.status = 'error'
      input.assistantMessage.error = message
      input.assistantMessage.content = input.assistantMessage.content.trim()
        ? `${input.assistantMessage.content}\n\n${message}`
        : message
      hooks.markConversationNotice(input.conversation.id, 'error')
    } finally {
      flushPendingDelta()
      isStreaming.value = false
      streamController = null
      hooks.touchConversation(input.conversation)
    }
  }

  function stop() {
    streamController?.abort()
  }

  function dispose() {
    stop()
  }

  return {
    isStreaming,
    stream,
    stop,
    dispose,
  }
}
