import type { Ref } from 'vue'
import type { StudioConversation, StudioMessage } from '@/components/studio/types'
import { buildStudioConversationTitle, createStudioId } from './studioConversationState'

export type StudioMessageTarget = {
  conversation: StudioConversation
  index: number
  message: StudioMessage
}

export type StudioMessageRuntimeHooks = {
  touchConversation: (conversation: StudioConversation) => void
  scheduleScrollToBottom: () => void
}

export type StudioMessageRuntimeInput = {
  conversations: Ref<StudioConversation[]>
  activeConversation: Ref<StudioConversation | null>
  hooks: StudioMessageRuntimeHooks
}

export function useStudioMessageRuntime(input: StudioMessageRuntimeInput) {
  function tombstone(message: StudioMessage, deletedAt: string): StudioMessage {
    return {
      id: message.id,
      role: message.role,
      mode: message.mode,
      replyToId: message.replyToId,
      content: '',
      createdAt: message.createdAt,
      updatedAt: deletedAt,
      deletedAt,
    }
  }

  function findMessage(messageId: string): StudioMessageTarget | null {
    if (!messageId) return null
    for (const conversation of input.conversations.value) {
      const index = conversation.messages.findIndex((item) => item.id === messageId)
      if (index >= 0) return { conversation, index, message: conversation.messages[index] }
    }
    return null
  }

  function addMessage(conversation: StudioConversation, message: Omit<StudioMessage, 'id' | 'createdAt'>) {
    const questionIndex = message.replyToId ? conversation.messages.findIndex((item) => item.id === message.replyToId) : -1
    const question = conversation.messages[questionIndex]
    const lastCreatedAt = Date.parse(conversation.messages.at(-1)?.createdAt || '')
    const nextCreatedAt = Number.isFinite(lastCreatedAt) ? Math.max(Date.now(), lastCreatedAt + 1) : Date.now()
    const next: StudioMessage = {
      id: createStudioId('message'),
      createdAt: question ? question.createdAt : new Date(nextCreatedAt).toISOString(),
      ...message,
    }
    const index = question ? questionIndex + 1 : conversation.messages.length
    conversation.messages.splice(index, 0, next)
    const inserted = conversation.messages[index] || next
    input.hooks.touchConversation(conversation)
    if (conversation.title === '新对话' && message.role === 'user') {
      conversation.title = buildStudioConversationTitle(message.content)
    }
    input.hooks.scheduleScrollToBottom()
    return inserted
  }

  function deleteActiveMessage(messageId: string) {
    const conversation = input.activeConversation.value
    if (!conversation) return null
    return removeMessage(conversation, messageId)
  }

  function removeMessage(conversation: StudioConversation, messageId: string) {
    const message = conversation.messages.find((item) => item.id === messageId)
    if (!message) return null
    const deletedAt = new Date().toISOString()
    conversation.messages = conversation.messages.filter((message) => message.id !== messageId)
    conversation.messageTombstones = [
      ...(conversation.messageTombstones || []),
      tombstone(message, deletedAt),
    ]
    invalidateStudioChatThread(conversation)
    input.hooks.touchConversation(conversation)
    return conversation
  }

  function replaceFromTarget(target: StudioMessageTarget, message: StudioMessage) {
    const { conversation, index } = target
    const previous = conversation.messages[index]
    const previousUpdatedAt = Date.parse(previous?.updatedAt || previous?.createdAt || '')
    const updatedAt = new Date(Math.max(Date.now(), Number.isFinite(previousUpdatedAt) ? previousUpdatedAt + 1 : 0)).toISOString()
    const nextMessage: StudioMessage = {
      ...message,
      updatedAt,
      baseUpdatedAt: previous?.updatedAt || previous?.createdAt,
    }
    conversation.messageTombstones = [
      ...(conversation.messageTombstones || []),
      ...conversation.messages.slice(index + 1).map((item) => tombstone(item, updatedAt)),
    ]
    conversation.messages = [
      ...conversation.messages.slice(0, index),
      nextMessage,
    ]
    invalidateStudioChatThread(conversation)
    if (!conversation.messages.slice(0, index).some((item) => item.role === 'user')) {
      conversation.title = buildStudioConversationTitle(message.content)
    }
    input.hooks.touchConversation(conversation)
  }

  function pruneAfterTarget(target: StudioMessageTarget) {
    const deletedAt = new Date().toISOString()
    target.conversation.messageTombstones = [
      ...(target.conversation.messageTombstones || []),
      ...target.conversation.messages.slice(target.index).map((item) => tombstone(item, deletedAt)),
    ]
    target.conversation.messages = target.conversation.messages.slice(0, target.index)
    invalidateStudioChatThread(target.conversation)
    input.hooks.touchConversation(target.conversation)
  }

  function findPreviousUserMessage(target: StudioMessageTarget) {
    if (target.message.replyToId) {
      return target.conversation.messages.find((item) => item.id === target.message.replyToId && item.role === 'user') || null
    }
    const isQuestion = (item: StudioMessage) => item.role === 'user' && item.mode === target.message.mode && item.content.trim()
    const question = target.conversation.messages
      .slice(0, target.index)
      .reverse()
      .find(isQuestion)
    if (!question) return null
    const ambiguous = target.conversation.messages.some((item) => (
      item.id !== question.id && item.createdAt === question.createdAt && isQuestion(item)
    ))
    return ambiguous ? null : question
  }

  return {
    addMessage,
    deleteActiveMessage,
    findMessage,
    findPreviousUserMessage,
    pruneAfterTarget,
    removeMessage,
    replaceFromTarget,
  }
}

export function invalidateStudioChatThread(conversation: StudioConversation) {
  conversation.upstreamConversationId = undefined
  conversation.upstreamParentMessageId = undefined
}
