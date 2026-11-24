import { nextTick, type Ref } from 'vue'
import { getAuthToken } from '@/api/client'
import { editableFileTasksApi } from '@/api/editableFileTasks'
import { normalizeImageCount } from '@/api/imageTasks'
import type {
  StudioComposeMode,
  StudioConversation,
  StudioFileKind,
  StudioImageCompareSource,
  StudioImageForm,
  StudioMessage,
  StudioReferenceImage,
} from '@/components/studio/types'
import type { useToast } from '@/composables/useToast'
import { buildStudioInpaintPrompt, createStudioImageTask, runStudioSearchRequest, studioErrorMessage, studioModeRequestErrorFallback, studioModeRetryErrorFallback } from './studioRequestView'
import type { useStudioChatStreamRuntime } from './studioChatStreamRuntime'
import type { useStudioComposerRuntime } from './studioComposerRuntime'
import type { useStudioFileTaskRuntime } from './studioFileTaskRuntime'
import type { useStudioImageTaskRuntime } from './studioImageTaskRuntime'
import type { useStudioMessageRuntime } from './studioMessageRuntime'
import { fetchStudioImageFile, type useStudioReferenceRuntime } from './studioReferenceRuntime'

export type StudioSendRuntimeHooks = {
  activeConversationId: Ref<string>
  ensureConversation: (content?: string) => StudioConversation
  markConversationNotice: (conversationId: string, state: 'done' | 'error' | 'running') => void
  clearConversationNotice: (conversationId: string) => void
  touchConversation: (conversation: StudioConversation) => void
  scheduleScrollToBottom: () => void
}

export type StudioSendRuntimeInput = {
  composerRuntime: ReturnType<typeof useStudioComposerRuntime>
  referenceRuntime: ReturnType<typeof useStudioReferenceRuntime>
  messageRuntime: ReturnType<typeof useStudioMessageRuntime>
  chatStreamRuntime: ReturnType<typeof useStudioChatStreamRuntime>
  imageTaskRuntime: Pick<ReturnType<typeof useStudioImageTaskRuntime>, 'rememberTask' | 'merge' | 'schedulePoll' | 'taskById'>
  fileTaskRuntime: Pick<ReturnType<typeof useStudioFileTaskRuntime>, 'merge' | 'schedulePoll'>
  chatModel: Ref<string>
  chatReasoningEffort: Ref<string>
  contextRounds: Ref<number>
  imageForm: StudioImageForm
  toast: Pick<ReturnType<typeof useToast>, 'success' | 'error' | 'warning'>
  hooks: StudioSendRuntimeHooks
}

export type StudioImageEditRequest = {
  prompt: string
  files: File[]
  userContent?: string
  referenceImages?: StudioReferenceImage[]
  assistantContent?: string
  inpaintSource?: StudioImageCompareSource
  imageCount?: number
}

type StudioSendRequest = {
  conversation: StudioConversation
  question: StudioMessage
  prompt: string
  files: File[]
  requestErrorFallback: string
  clearReferencesOnSuccess?: boolean
  rememberImageReferences?: boolean
  assistantContent?: string
  inpaintSource?: StudioImageCompareSource
  imageOptions?: Partial<StudioImageForm>
  fileKind?: StudioFileKind
}

export function useStudioSendRuntime(input: StudioSendRuntimeInput) {
  const {
    chatModel,
    chatReasoningEffort,
    chatStreamRuntime,
    composerRuntime,
    contextRounds,
    hooks,
    imageForm,
    imageTaskRuntime,
    fileTaskRuntime,
    messageRuntime,
    referenceRuntime,
    toast,
  } = input

  function canSendRound(conversation: StudioConversation, existingQuestionId?: string) {
    const limit = contextRounds.value
    let rounds = existingQuestionId ? 0 : 1
    let questionFound = !existingQuestionId
    for (const message of conversation.messages) {
      if (message.role !== 'user' || message.deletedAt) continue
      rounds += 1
      if (message.id === existingQuestionId) {
        questionFound = true
        break
      }
    }
    if (!questionFound) return false
    if (rounds <= limit) return true
    toast.warning(`已达到 ${limit} 轮对话上限，请新建对话后继续。`)
    return false
  }

  async function sendMessage() {
    const content = composerRuntime.composerText.value.trim()
    if (!content || composerRuntime.isSending.value || chatStreamRuntime.isStreaming.value) return

    if (composerRuntime.editingMessageId.value) {
      await sendEditedMessage(content)
      return
    }

    const mode = composerRuntime.composeMode.value
    if (!validateFileRequest(mode)) return
    const conversation = hooks.ensureConversation(content)
    if (!canSendRound(conversation)) return
    const withReferences = mode === 'image' || mode === 'chat' || mode === 'file'
    const files = referenceRuntime.selectedFiles()
    const attachments = referenceRuntime.attachmentNames()
    const referenceImages = withReferences ? referenceRuntime.messageReferenceImages() : []
    const clearReferencesImmediately = mode === 'chat' && referenceImages.length > 0

    const question = messageRuntime.addMessage(conversation, {
      role: 'user',
      mode,
      content,
      status: 'done',
      fileKind: mode === 'file' ? composerRuntime.fileKind.value : undefined,
      attachments: withReferences && attachments.length ? attachments : undefined,
      referenceImages: buildMessageReferenceImages(referenceImages),
    })
    composerRuntime.composerText.value = ''
    if (clearReferencesImmediately) referenceRuntime.clear()
    await runRequestWithComposerState({
      question,
      conversation,
      prompt: content,
      files,
      requestErrorFallback: studioModeRequestErrorFallback(mode),
      clearReferencesOnSuccess: withReferences && !clearReferencesImmediately,
      rememberImageReferences: mode === 'image' || mode === 'chat',
    })
  }

  async function sendEditedMessage(content: string) {
    const target = messageRuntime.findMessage(composerRuntime.editingMessageId.value)
    if (!target || target.message.role !== 'user') {
      composerRuntime.editingMessageId.value = ''
      return
    }

    const { conversation, message } = target
    if (!canSendRound(conversation, message.id)) return
    const mode = composerRuntime.composeMode.value
    if (!validateFileRequest(mode)) return
    const withReferences = mode === 'image' || mode === 'chat' || mode === 'file'
    const files = referenceRuntime.selectedFiles()
    const attachments = referenceRuntime.attachmentNames()
    const referenceImages = withReferences ? referenceRuntime.messageReferenceImages() : []
    const clearReferencesImmediately = mode === 'chat' && referenceImages.length > 0
    const imageAnswer = mode === 'image' ? findImageAnswer(message.id) : undefined
    if (mode === 'image' && !files.length && (message.attachments?.length || message.referenceImages?.length)) {
      toast.error('请添加参考图后再提交图片编辑')
      return
    }
    const previousRefs = message.referenceImages || []
    const originalMask = referenceImages.at(-1)
    const sameInpaintInputs = referenceImages.length === 2
      && originalMask?.id === previousRefs.at(-1)?.id
      && (referenceImages[0].id === previousRefs[0]?.id || referenceImages[0].source?.src === imageAnswer?.inpaintSource?.src)
    const inpaintSource = sameInpaintInputs ? imageAnswer?.inpaintSource : undefined
    const editPrompt = inpaintSource ? buildStudioInpaintPrompt(content.replace(/^局部修改[：:]\s*/, '')) : undefined
    const editedMessage: StudioMessage = {
      ...message,
      mode,
      content: editPrompt ? `局部修改：${content.replace(/^局部修改[：:]\s*/, '')}` : content,
      status: 'done',
      error: undefined,
      fileKind: mode === 'file' ? composerRuntime.fileKind.value : undefined,
      attachments: withReferences && attachments.length ? attachments : undefined,
      referenceImages: buildMessageReferenceImages(referenceImages),
      imageEditPrompt: editPrompt,
    }

    hooks.activeConversationId.value = conversation.id
    messageRuntime.replaceFromTarget(target, editedMessage)
    composerRuntime.editingMessageId.value = ''
    composerRuntime.composerText.value = ''
    if (clearReferencesImmediately) referenceRuntime.clear()
    hooks.clearConversationNotice(conversation.id)

    await runRequestWithComposerState({
      question: editedMessage,
      conversation,
      prompt: editPrompt || content,
      files,
      requestErrorFallback: studioModeRequestErrorFallback(mode),
      clearReferencesOnSuccess: withReferences && !clearReferencesImmediately,
      rememberImageReferences: mode === 'image' || mode === 'chat',
      inpaintSource,
      imageOptions: inpaintSource ? { n: 1 } : undefined,
    })
  }

  async function sendImageEditRequest(request: StudioImageEditRequest) {
    const prompt = request.prompt.trim()
    if (!prompt || composerRuntime.isSending.value || chatStreamRuntime.isStreaming.value) return false

    const userContent = request.userContent?.trim() || prompt
    const conversation = hooks.ensureConversation(userContent)
    if (!canSendRound(conversation)) return false
    hooks.activeConversationId.value = conversation.id
    leaveMessageEdit()
    composerRuntime.activateImageMode()

    const question = messageRuntime.addMessage(conversation, {
      role: 'user',
      mode: 'image',
      content: userContent,
      imageEditPrompt: prompt,
      status: 'done',
      attachments: request.files.length ? request.files.map((file) => file.name).filter(Boolean) : undefined,
      referenceImages: buildMessageReferenceImages(request.referenceImages || []),
    })

    return runRequestWithComposerState({
      question,
      conversation,
      prompt,
      files: request.files,
      requestErrorFallback: '图片编辑任务提交失败',
      assistantContent: request.assistantContent,
      inpaintSource: request.inpaintSource,
      rememberImageReferences: true,
      imageOptions: { n: request.imageCount ?? imageForm.n },
    })
  }

  function leaveMessageEdit() {
    if (composerRuntime.editingMessageId.value) referenceRuntime.clear()
    composerRuntime.cancelMessageEdit(false)
  }

  function fillComposerFromMessage(message: StudioMessage) {
    leaveMessageEdit()
    composerRuntime.fillFromMessage(message)
  }

  async function editMessage(message: StudioMessage) {
    if (composerRuntime.isSending.value || chatStreamRuntime.isStreaming.value) return
    const target = messageRuntime.findMessage(message.id)
    if (!target || target.message.role !== 'user') return
    if (!canSendRound(target.conversation, target.message.id)) return
    hooks.activeConversationId.value = target.conversation.id
    composerRuntime.startEdit(target.message)
    referenceRuntime.clear()
    if (target.message.mode === 'file' && (target.message.fileKind === 'psd' || target.message.referenceImages?.length)) {
      toast.error('请重新上传原图后提交文件任务')
    }
    hooks.scheduleScrollToBottom()
    if (message.mode === 'chat' && (message.referenceImages?.length || message.attachments?.length)) {
      await restoreChatEditReferences(target.message)
      return
    }
    if (message.mode === 'image' && (message.referenceImages?.length || message.attachments?.length)) {
      const response = findImageAnswer(message.id)
      const replay = await restoreImageRequest(target.message, response)
      if (!replay || composerRuntime.editingMessageId.value !== message.id) return
      const legacySource = response?.inpaintSource && !target.message.imageEditPrompt ? response.inpaintSource : undefined
      const images = target.message.referenceImages || []
      try {
        await referenceRuntime.replaceWithImageReferences(images, replay.files, legacySource, () => (
          composerRuntime.editingMessageId.value === message.id && !referenceRuntime.selectedFiles().length
        ))
      } catch (error) {
        toast.error(studioErrorMessage(error, '读取参考图失败，请重新上传原图'))
      }
    }
  }

  async function restoreChatEditReferences(message: StudioMessage) {
    const images = message.referenceImages || []
    const token = getAuthToken()
    const canReplace = () => composerRuntime.editingMessageId.value === message.id
      && composerRuntime.composeMode.value === 'chat' && !referenceRuntime.selectedFiles().length
      && getAuthToken() === token
    composerRuntime.setSending(true)
    try {
      const resolved = await Promise.allSettled(images.map(async (image) => ({
        image,
        file: await referenceRuntime.restoreChatImageReference(image),
      })))
      if (!canReplace()) return
      const available = resolved.flatMap((item) => item.status === 'fulfilled' ? [item.value] : [])
      await referenceRuntime.replaceWithImageReferences(
        available.map((item) => item.image), available.map((item) => item.file), undefined, canReplace,
      )
      if (composerRuntime.editingMessageId.value !== message.id) return
      const missing = Math.max(images.length, message.attachments?.length || 0) - available.length
      if (missing) toast.warning(`有 ${missing} 张原参考图无法读取，可重新上传后提交。`)
    } catch (error) {
      toast.warning(studioErrorMessage(error, '读取参考图失败，请重新上传原图'))
    } finally {
      composerRuntime.setSending(false)
    }
  }

  async function resendMessage(message: StudioMessage) {
    if (composerRuntime.isSending.value || chatStreamRuntime.isStreaming.value) return
    const target = messageRuntime.findMessage(message.id)
    if (!target || target.message.role !== 'user' || !canSendRound(target.conversation)) return
    if (message.mode === 'chat') {
      if (!target.message.content.trim()) return
      const { conversation, message: original } = target
      hooks.activeConversationId.value = conversation.id
      fillComposerFromMessage(original)
      referenceRuntime.clear()
      const question = messageRuntime.addMessage(conversation, {
        role: 'user',
        mode: 'chat',
        content: original.content,
        status: 'done',
        attachments: original.attachments,
        referenceImages: original.referenceImages,
      })
      composerRuntime.composerText.value = ''
      await runRequestWithComposerState({
        conversation,
        question,
        prompt: original.content,
        files: [],
        requestErrorFallback: studioModeRetryErrorFallback('chat'),
      })
      return
    }
    if (message.mode === 'image') {
      const questionSource = target.message
      const replay = await restoreImageRequest(questionSource, findImageAnswer(message.id))
      const currentTarget = messageRuntime.findMessage(message.id)
      if (!replay || !currentTarget || !canSendRound(currentTarget.conversation)) return
      hooks.activeConversationId.value = currentTarget.conversation.id
      fillComposerFromMessage(message)
      const question = messageRuntime.addMessage(currentTarget.conversation, {
        role: 'user', mode: 'image', content: questionSource.content, status: 'done',
        attachments: questionSource.attachments, referenceImages: questionSource.referenceImages, imageEditPrompt: questionSource.imageEditPrompt,
      })
      composerRuntime.composerText.value = ''
      await runRequestWithComposerState({
        conversation: currentTarget.conversation, question, ...replay,
        requestErrorFallback: studioModeRetryErrorFallback('image'),
      })
      return
    }
    hooks.activeConversationId.value = target.conversation.id
    if (message.mode === 'file') {
      referenceRuntime.clear()
      if (message.fileKind === 'psd' || message.referenceImages?.length) {
        fillComposerFromMessage(message)
        toast.error('请重新上传原图后提交文件任务')
        return
      }
    }
    fillComposerFromMessage(message)
    await nextTick()
    await sendMessage()
  }

  async function retryAssistantMessage(message: StudioMessage) {
    if (composerRuntime.isSending.value || chatStreamRuntime.isStreaming.value) return
    const target = messageRuntime.findMessage(message.id)
    if (!target) return
    const previousUserMessage = messageRuntime.findPreviousUserMessage(target)
    if (!previousUserMessage) {
      toast.error('找不到对应的提问，请从原提问重发')
      return
    }
    if (!canSendRound(target.conversation, previousUserMessage.id)) return

    if (previousUserMessage.mode === 'file' && (previousUserMessage.fileKind === 'psd' || previousUserMessage.referenceImages?.length)) {
      referenceRuntime.clear()
      fillComposerFromMessage(previousUserMessage)
      toast.error('请重新上传原图后提交文件任务')
      return
    }

    if (previousUserMessage.mode === 'file') referenceRuntime.clear()

    const replay = previousUserMessage.mode === 'image'
      ? await restoreImageRequest(previousUserMessage, target.message)
      : { prompt: previousUserMessage.content, files: [] }
    if (!replay) return
    const currentTarget = messageRuntime.findMessage(message.id)
    if (!currentTarget) return
    if (previousUserMessage.mode === 'image' && !canSendRound(currentTarget.conversation, previousUserMessage.id)) return

    hooks.activeConversationId.value = currentTarget.conversation.id
    if (previousUserMessage.mode === 'image') {
      messageRuntime.removeMessage(currentTarget.conversation, currentTarget.message.id)
    } else {
      messageRuntime.pruneAfterTarget(currentTarget)
    }
    hooks.clearConversationNotice(currentTarget.conversation.id)

    await runRequestWithComposerState({
      question: previousUserMessage,
      conversation: currentTarget.conversation,
      ...replay,
      requestErrorFallback: studioModeRetryErrorFallback(previousUserMessage.mode),
      fileKind: previousUserMessage.fileKind,
    })
  }

  function findImageAnswer(questionId: string) {
    const target = messageRuntime.findMessage(questionId)
    if (!target) return
    const laterMessages = target.conversation.messages.slice(target.index + 1)
    const linked = laterMessages.find((item) => item.replyToId === questionId)
    if (linked) return linked
    const next = laterMessages[0]
    if (next?.role === 'assistant' && next.mode === 'image' && !next.replyToId) return next
  }

  async function restoreImageRequest(question: StudioMessage, response?: StudioMessage) {
    composerRuntime.setSending(true)
    try {
      const references = question.referenceImages || []
      const legacyInpaint = response?.inpaintSource && !question.imageEditPrompt ? response.inpaintSource : undefined
      const referenceCount = references.length + Number(Boolean(legacyInpaint))
      const imageTaskMode = response?.taskId ? imageTaskRuntime.taskById.value.get(response.taskId)?.mode : undefined
      const expectedCount = Math.max(question.attachments?.length || 0, response?.imageInputCount || 0, Number(imageTaskMode === 'edit'))
      if (referenceCount < expectedCount || (legacyInpaint && !references.length)) {
        throw new Error('原参考图已不可用。请重新上传原图，或从最新的结果图继续修改。')
      }
      const files = await referenceRuntime.restoreImageReferences(references)
      if (legacyInpaint) files.unshift(await fetchStudioImageFile(legacyInpaint.src, legacyInpaint.name))
      return {
        files,
        prompt: question.imageEditPrompt || (legacyInpaint
          ? buildStudioInpaintPrompt(question.content.replace(/^局部修改[：:]\s*/, ''))
          : question.content),
        inpaintSource: response?.inpaintSource,
        imageOptions: response ? {
          model: response.model || imageForm.model,
          size: response.imageSize || imageForm.size,
          quality: response.imageQuality || imageForm.quality,
          n: response.imageCount ?? imageForm.n,
        } : undefined,
      }
    } catch (error) {
      toast.error(studioErrorMessage(error, '读取原参考图失败，请重新上传原图'))
      return null
    } finally {
      composerRuntime.setSending(false)
    }
  }

  async function runRequestWithComposerState(input: StudioSendRequest) {
    composerRuntime.setSending(true)
    try {
      if (input.rememberImageReferences && input.question.referenceImages?.length) {
        const token = input.question.mode === 'chat' ? getAuthToken() : undefined
        const references = await referenceRuntime.rememberImageReferences(
          input.question.referenceImages, input.files, input.question.mode === 'chat',
        )
        if (token !== undefined && getAuthToken() !== token) {
          throw new Error('登录密钥已切换，请重新发送消息')
        }
        const question = messageRuntime.findMessage(input.question.id)?.message
        if (!question) return false
        question.referenceImages = references
        hooks.touchConversation(input.conversation)
      }
      const success = await sendByMode(input)
      if (success && input.clearReferencesOnSuccess) {
        referenceRuntime.clear()
      }
      return success
    } catch (error) {
      const message = studioErrorMessage(error, input.requestErrorFallback)
      hooks.markConversationNotice(input.conversation.id, 'error')
      messageRuntime.addMessage(input.conversation, {
        role: 'assistant',
        mode: input.question.mode,
        replyToId: input.question.id,
        content: message,
        status: 'error',
        error: message,
      })
      return false
    } finally {
      composerRuntime.setSending(false)
      hooks.scheduleScrollToBottom()
    }
  }

  async function sendByMode(request: StudioSendRequest) {
    const { conversation, question, prompt } = request
    if (question.mode === 'chat') {
      await sendTextMessage(conversation, question.id)
      return true
    } else if (question.mode === 'search') {
      return sendSearchMessage(conversation, prompt, question.id)
    } else if (question.mode === 'file') {
      return sendFileMessage(conversation, prompt, request.fileKind || composerRuntime.fileKind.value, question.id)
    } else {
      return sendImageMessage(request)
    }
  }

  async function sendTextMessage(conversation: StudioConversation, replyToId: string) {
    const assistantMessage = messageRuntime.addMessage(conversation, {
      role: 'assistant',
      mode: 'chat',
      replyToId,
      content: '',
      status: 'streaming',
      model: chatModel.value,
    })

    const result = await chatStreamRuntime.stream({
      conversation,
      assistantMessage,
      questionId: replyToId,
      model: chatModel.value,
      reasoningEffort: chatReasoningEffort.value,
      resolveReference: referenceRuntime.resolveChatReference,
      isMessageRetained: (messageId) => {
        const target = messageRuntime.findMessage(messageId)
        return target?.conversation === conversation && !target.message.deletedAt
      },
      onContextNotice: (notice) => toast.warning(notice),
    })
    if (result === 'discarded' && messageRuntime.findMessage(assistantMessage.id)?.conversation === conversation) {
      messageRuntime.removeMessage(conversation, assistantMessage.id)
    }
  }

  async function sendSearchMessage(conversation: StudioConversation, prompt: string, replyToId: string) {
    const assistantMessage = messageRuntime.addMessage(conversation, {
      role: 'assistant',
      mode: 'search',
      replyToId,
      content: '正在搜索...',
      status: 'sending',
      model: 'search',
    })

    try {
      const result = await runStudioSearchRequest(prompt, assistantMessage.id)
      assistantMessage.searchSources = result.sources
      assistantMessage.searchImageGroups = result.imageGroups
      assistantMessage.content = result.content
      assistantMessage.status = 'done'
      hooks.markConversationNotice(conversation.id, 'done')
      return true
    } catch (error) {
      const message = studioErrorMessage(error, '搜索请求失败')
      assistantMessage.status = 'error'
      assistantMessage.content = message
      assistantMessage.error = message
      hooks.markConversationNotice(conversation.id, 'error')
      return false
    } finally {
      hooks.touchConversation(conversation)
      hooks.scheduleScrollToBottom()
    }
  }

  async function sendImageMessage(request: StudioSendRequest) {
    const { conversation, question, prompt, files, imageOptions } = request
    const form = { ...imageForm, ...imageOptions, n: normalizeImageCount(imageOptions?.n ?? imageForm.n) }
    const assistantMessage = messageRuntime.addMessage(conversation, {
      role: 'assistant',
      mode: 'image',
      replyToId: question.id,
      content: request.assistantContent || (files.length ? '图像编辑任务已提交' : '图片任务已提交'),
      status: 'queued',
      model: form.model,
      imageSize: form.size,
      imageCount: form.n,
      imageInputCount: files.length,
      imageQuality: form.quality,
      inpaintSource: request.inpaintSource,
    })

    try {
      const task = await createStudioImageTask({
        prompt,
        files,
        imageForm: form,
      })
      assistantMessage.taskId = task.id
      assistantMessage.status = 'running'
      hooks.touchConversation(conversation)
      imageTaskRuntime.rememberTask(task.id)
      imageTaskRuntime.merge([task])
      toast.success('图片任务已提交')
      imageTaskRuntime.schedulePoll()
      return true
    } catch (error) {
      const message = studioErrorMessage(error, '图片任务提交失败')
      assistantMessage.status = 'error'
      assistantMessage.content = message
      assistantMessage.error = message
      hooks.touchConversation(conversation)
      hooks.markConversationNotice(conversation.id, 'error')
      return false
    }
  }

  async function sendFileMessage(
    conversation: StudioConversation,
    prompt: string,
    kind: StudioFileKind,
    replyToId: string,
  ) {
    const label = kind === 'psd' ? 'PSD' : 'PPT'
    const assistantMessage = messageRuntime.addMessage(conversation, {
      role: 'assistant',
      mode: 'file',
      replyToId,
      content: `${label} 文件任务已提交`,
      status: 'queued',
      fileKind: kind,
    })

    try {
      const task = await editableFileTasksApi.create({
        kind,
        prompt,
        base64Images: referenceRuntime.references.value.map((reference) => reference.dataUrl).filter(Boolean),
      })
      assistantMessage.fileTaskId = task.id
      assistantMessage.status = task.status === 'success' ? 'done' : task.status === 'error' ? 'error' : task.status
      assistantMessage.error = task.status === 'error' ? task.error : undefined
      hooks.touchConversation(conversation)
      fileTaskRuntime.merge([task])
      if (task.status === 'error') {
        hooks.markConversationNotice(conversation.id, 'error')
        return false
      }
      if (task.status === 'success') {
        hooks.markConversationNotice(conversation.id, 'done')
      } else {
        hooks.markConversationNotice(conversation.id, 'running')
        fileTaskRuntime.schedulePoll()
      }
      toast.success(`${label} 文件任务已提交`)
      return true
    } catch (error) {
      const message = studioErrorMessage(error, '文件任务提交失败')
      assistantMessage.status = 'error'
      assistantMessage.content = message
      assistantMessage.error = message
      hooks.touchConversation(conversation)
      hooks.markConversationNotice(conversation.id, 'error')
      return false
    }
  }

  function validateFileRequest(mode: StudioComposeMode) {
    if (mode !== 'file' || composerRuntime.fileKind.value !== 'psd' || referenceRuntime.references.value.length) {
      return true
    }
    toast.error('PSD 文件任务至少需要上传一张原图')
    return false
  }

  function buildMessageReferenceImages(referenceImages: StudioReferenceImage[]) {
    return referenceImages.length ? referenceImages : undefined
  }

  return {
    canSendRound,
    editMessage,
    fillComposerFromMessage,
    resendMessage,
    retryAssistantMessage,
    sendImageEditRequest,
    sendMessage,
  }
}
