import { streamChatCompletion } from '@/api/chatStream'
import { getAuthToken } from '@/api/client'
import { openaiV1Api, type OpenAIV1ChatContentPart, type OpenAIV1ChatMessage } from '@/api/openaiV1'
import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_IMAGE_QUALITY,
  imageTasksApi,
  normalizeImageCount,
  type ImageTask,
} from '@/api/imageTasks'
import type { StudioComposeMode, StudioConversation, StudioImageForm, StudioMessage, StudioReferenceImage } from '@/components/studio/types'
import {
  extractStudioSearchImageGroupsFromText,
  formatStudioSearchResult,
  normalizeStudioSearchImageGroups,
  normalizeStudioSearchSources,
} from './studioSearchView'
import { MAX_REFERENCE_TOTAL_BYTES } from './studioReferenceRuntime'
import { errorMessage } from '@/lib/errorMessage'

// Limit how much image data Studio replays with a chat request.
const MAX_CHAT_REFERENCE_BYTES = 10 * 1024 * 1024

export type StudioChatReplyHandlers = {
  onDelta: (delta: string) => void
}

export type StudioChatContextInput = {
  conversation: StudioConversation
  questionId: string
  resolveReference: (image: StudioReferenceImage, signal?: AbortSignal) => Promise<string>
  signal?: AbortSignal
}

export type StudioSearchReply = {
  content: string
  sources?: StudioMessage['searchSources']
  imageGroups?: StudioMessage['searchImageGroups']
}

export type StudioImageTaskInput = {
  prompt: string
  files: File[]
  imageForm: StudioImageForm
}

export async function buildStudioChatContext(input: StudioChatContextInput) {
  const { conversation, questionId, resolveReference, signal } = input
  signal?.throwIfAborted()
  const questionIndex = conversation.messages.findIndex((message) => message.id === questionId)
  const question = conversation.messages[questionIndex]
  if (!question || question.role !== 'user' || question.deletedAt) throw new Error('找不到当前提问')

  const turns = new Map<string, StudioMessage[]>()
  const latestQuestionByMode = new Map<StudioComposeMode, string>()
  for (const message of conversation.messages.slice(0, questionIndex)) {
    if (message.role === 'user') {
      latestQuestionByMode.set(message.mode, message.id)
      if (!message.deletedAt && hasStudioChatContextContent(message)) turns.set(message.id, [message])
    } else if (!message.deletedAt && hasStudioChatContextContent(message)) {
      const replyToId = message.replyToId || latestQuestionByMode.get(message.mode)
      if (replyToId) turns.get(replyToId)?.push(message)
    }
  }

  const history = Array.from(turns.values()).flat()
  const messages: OpenAIV1ChatMessage[] = []
  let missingImageCount = 0
  let sizeOmittedImageCount = 0
  let remainingImageBytes = MAX_REFERENCE_TOTAL_BYTES
  for (const message of [...history, question].reverse()) {
    signal?.throwIfAborted()
    const text = buildStudioChatContextText(message)
    const images = chatReferenceImages(message)
    const expectedImages = message.role === 'user' && message.mode === 'chat'
      ? Math.max(images.length, message.attachments?.length || 0)
      : 0
    missingImageCount += expectedImages - images.length

    const imageParts: OpenAIV1ChatContentPart[] = []
    for (const image of images) {
      const maxImageBytes = Math.min(remainingImageBytes, MAX_CHAT_REFERENCE_BYTES)
      const knownBytes = image.dataUrl ? inlineImageBytes(image.dataUrl) : image.size
      if (knownBytes > maxImageBytes || !maxImageBytes) {
        sizeOmittedImageCount++
        continue
      }

      const url = await resolveReference(image, signal).catch(() => '')
      signal?.throwIfAborted()
      if (!url) {
        missingImageCount++
        continue
      }
      const bytes = inlineImageBytes(url)
      if (bytes > maxImageBytes) {
        sizeOmittedImageCount++
        continue
      }
      remainingImageBytes -= bytes
      imageParts.push({ type: 'image_url', image_url: { url } })
    }
    if (imageParts.length) {
      if (text.trim()) imageParts.unshift({ type: 'text', text })
      messages.push({ role: message.role, content: imageParts })
    } else if (text.trim()) {
      messages.push({ role: message.role, content: text })
    }
  }
  return { messages: messages.reverse(), missingImageCount, sizeOmittedImageCount }
}

export function studioModeRequestErrorFallback(mode: StudioComposeMode) {
  if (mode === 'image') return '图片生成失败'
  if (mode === 'file') return '文件任务提交失败'
  if (mode === 'search') return '搜索请求失败'
  return '对话请求失败'
}

export function studioModeRetryErrorFallback(mode: StudioComposeMode) {
  if (mode === 'image') return '图片重新生成失败'
  if (mode === 'file') return '文件任务重新提交失败'
  if (mode === 'search') return '搜索重新请求失败'
  return '对话重新生成失败'
}

export function studioErrorMessage(error: unknown, fallback: string) {
  return errorMessage(error, fallback)
}

export async function streamStudioChatReply(input: StudioChatContextInput & {
  model: string
  reasoningEffort: string
  signal: AbortSignal
  handlers: StudioChatReplyHandlers
  canSubmit: () => boolean
  onContextNotice?: (message: string) => void
}) {
  const token = getAuthToken()
  const { messages, missingImageCount, sizeOmittedImageCount } = await buildStudioChatContext(input)
  input.signal.throwIfAborted()
  if (getAuthToken() !== token) throw new Error('登录密钥已切换，请重新发送消息')
  if (!input.canSubmit()) return false
  const notices = []
  if (missingImageCount) notices.push(`有 ${missingImageCount} 张参考图无法读取，本次携带其余可用内容。`)
  if (sizeOmittedImageCount) notices.push(`有 ${sizeOmittedImageCount} 张参考图超出本次图片大小限制，已省略。`)
  if (notices.length) input.onContextNotice?.(notices.join(' '))
  await streamChatCompletion({
    model: input.model,
    messages,
    reasoningEffort: input.reasoningEffort,
    signal: input.signal,
    onDelta: input.handlers.onDelta,
  })
  return true
}

export async function runStudioSearchRequest(prompt: string, ownerId: string): Promise<StudioSearchReply> {
  const result = await openaiV1Api.search(prompt)
  const sources = normalizeStudioSearchSources(result.sources)
  const imageGroups = normalizeStudioSearchImageGroups(result.image_groups) || extractStudioSearchImageGroupsFromText(result.answer)
  return {
    content: formatStudioSearchResult(result, ownerId, sources?.length || 0),
    sources,
    imageGroups,
  }
}

export function buildStudioInpaintPrompt(prompt: string) {
  return [
    '你会收到两张参考图：第一张是原图，第二张是带蓝色标记的原图。',
    '只修改蓝色标记覆盖的局部区域，蓝色标记只是区域说明，不要出现在最终图片里。',
    '未标记区域尽量保持与第一张原图一致。',
    `局部修改要求：${prompt}`,
  ].join('\n')
}

export async function createStudioImageTask(input: StudioImageTaskInput): Promise<ImageTask> {
  const model = input.imageForm.model || DEFAULT_IMAGE_MODEL
  const n = normalizeImageCount(input.imageForm.n)
  const size = input.imageForm.size
  const quality = input.imageForm.quality || DEFAULT_IMAGE_QUALITY

  return input.files.length
    ? imageTasksApi.createEdit({
      prompt: input.prompt,
      files: input.files,
      model,
      n,
      size,
      quality,
    })
    : imageTasksApi.createGeneration({
      prompt: input.prompt,
      model,
      n,
      size,
      quality,
    })
}

function buildStudioChatContextText(message: StudioMessage) {
  if (message.role === 'user' && message.mode === 'image') return `画图请求：${message.content}`
  if (message.role === 'user' && message.mode === 'search') return `搜索请求：${message.content}`
  if (message.role === 'user' && message.mode === 'file') return `${message.fileKind === 'psd' ? 'PSD' : 'PPT'} 文件请求：${message.content}`
  if (message.role === 'assistant' && message.mode === 'image') {
    const base = message.content.trim() || '（图片任务结果）'
    return message.status === 'error'
      ? `${base}\n（图片任务失败${message.error ? `：${message.error}` : ''}）`
      : base
  }
  if (message.role === 'assistant' && message.mode === 'file') {
    const base = message.content.trim() || '（文件任务结果）'
    return message.status === 'error'
      ? `${base}\n（文件任务失败${message.error ? `：${message.error}` : ''}）`
      : base
  }
  if (message.status === 'error' && message.error) {
    return message.content.trim()
      ? `${message.content}\n（上一轮失败：${message.error}）`
      : `（上一轮失败：${message.error}）`
  }
  return message.content
}

function chatReferenceImages(message: StudioMessage) {
  return message.role === 'user' && message.mode === 'chat' ? message.referenceImages || [] : []
}

function inlineImageBytes(dataUrl: string) {
  const payloadLength = dataUrl.length - dataUrl.indexOf(',') - 1
  const padding = dataUrl.endsWith('==') ? 2 : Number(dataUrl.endsWith('='))
  return Math.max(0, Math.floor(payloadLength * 3 / 4) - padding)
}

function hasStudioChatContextContent(message: StudioMessage) {
  return Boolean(buildStudioChatContextText(message).trim() || chatReferenceImages(message).length
    || (message.role === 'user' && message.mode === 'chat' && message.attachments?.length))
}
