import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { StudioMessage, StudioPreviewImage, StudioReference, StudioReferenceImage } from '@/components/studio/types'
import { createStudioId, MAX_SYNCED_STUDIO_REFERENCE_CHARS } from './studioConversationState'

const DEFAULT_MAX_REFERENCE_FILES = 8
const REFERENCE_STORE = 'references'
const MAX_REFERENCE_FILE_BYTES = 50 * 1024 * 1024
export const MAX_REFERENCE_TOTAL_BYTES = 100 * 1024 * 1024
const REFERENCE_CACHE_MAX_BYTES = 192 * 1024 * 1024
const REFERENCE_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000

type CachedReference = { key: string; file: File; savedAt: number }

export type StudioReferenceRuntimeOptions = {
  maxFiles?: number
}

function isImageFile(file: File) {
  return file.type.startsWith('image/') || /\.(avif|bmp|gif|heic|heif|ico|jpe?g|png|svg|tiff?|webp)$/i.test(file.name)
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('读取参考图失败'))
    reader.readAsDataURL(file)
  })
}

function openReferenceCache() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('studio-image-references', 1)
    request.onupgradeneeded = () => request.result.createObjectStore(REFERENCE_STORE, { keyPath: 'key' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function cacheReferenceFiles(entries: CachedReference[]) {
  const db = await openReferenceCache()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(REFERENCE_STORE, 'readwrite')
      transaction.oncomplete = () => resolve()
      transaction.onabort = () => reject(transaction.error)
      const store = transaction.objectStore(REFERENCE_STORE)
      for (const entry of entries) store.put(entry)
      const request = store.getAll()
      request.onsuccess = () => {
        const rows: CachedReference[] = request.result
        rows.sort((a, b) => b.savedAt - a.savedAt)
        let bytes = 0
        for (const row of rows) {
          if (Date.now() - row.savedAt > REFERENCE_CACHE_MAX_AGE || bytes + row.file.size > REFERENCE_CACHE_MAX_BYTES) {
            store.delete(row.key)
          } else {
            bytes += row.file.size
          }
        }
      }
    })
  } finally {
    db.close()
  }
}

async function readReferenceFile(key: string) {
  const db = await openReferenceCache()
  try {
    return await new Promise<File | undefined>((resolve, reject) => {
      const store = db.transaction(REFERENCE_STORE, 'readwrite').objectStore(REFERENCE_STORE)
      const request = store.get(key)
      request.onsuccess = () => {
        const row: CachedReference | undefined = request.result
        if (!row) return resolve(undefined)
        if (Date.now() - row.savedAt <= REFERENCE_CACHE_MAX_AGE) return resolve(row.file)
        store.delete(key)
        resolve(undefined)
      }
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

function cachedReferenceIds(messages: StudioMessage[]) {
  return new Set(messages.flatMap((message) => (message.referenceImages || [])
    .filter((image) => image.originalInBrowser || image.dataUrl.length > MAX_SYNCED_STUDIO_REFERENCE_CHARS)
    .map((image) => image.id)))
}

async function removeCachedReferences(owner: string, ids: ReadonlySet<string> | undefined) {
  if (ids && !ids.size) return
  const db = await openReferenceCache()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(REFERENCE_STORE, 'readwrite')
      transaction.oncomplete = () => resolve()
      transaction.onabort = () => reject(transaction.error)
      const store = transaction.objectStore(REFERENCE_STORE)
      if (ids) {
        for (const id of ids) store.delete(JSON.stringify([owner, id]))
      } else {
        const ownerPrefix = JSON.stringify([owner]).slice(0, -1) + ','
        const request = store.openKeyCursor()
        request.onsuccess = () => {
          const cursor = request.result
          if (!cursor) return
          if (typeof cursor.key === 'string' && cursor.key.startsWith(ownerPrefix)) store.delete(cursor.key)
          cursor.continue()
        }
      }
    })
  } finally {
    db.close()
  }
}

export async function createStudioReferenceFromFile(file: File): Promise<StudioReference> {
  if (file.size > MAX_REFERENCE_FILE_BYTES) throw new Error('单张参考图不能超过 50 MB')
  const dataUrl = await readFileAsDataUrl(file)
  return {
    id: createStudioId('source'),
    name: file.name || '参考图',
    type: file.type || 'image/png',
    size: file.size,
    dataUrl,
  }
}

export function toStudioMessageReferenceImage(reference: StudioReference): StudioReferenceImage {
  return {
    id: reference.id,
    name: reference.name,
    type: reference.type,
    size: reference.size,
    dataUrl: reference.dataUrl,
    source: reference.source,
    originalInBrowser: reference.originalInBrowser,
  }
}

export function useStudioReferenceRuntime(options: StudioReferenceRuntimeOptions = {}) {
  const auth = useAuthStore()
  const maxFiles = options.maxFiles || DEFAULT_MAX_REFERENCE_FILES
  const files = ref<File[]>([])
  const references = ref<StudioReference[]>([])
  const preview = ref<StudioPreviewImage | null>(null)

  function attachmentNames() {
    return references.value.map((reference) => reference.name)
  }

  function messageReferenceImages(): StudioReferenceImage[] {
    return references.value
      .map(toStudioMessageReferenceImage)
      .slice(0, maxFiles)
  }

  function selectedFiles() {
    return files.value.slice(0, maxFiles)
  }

  async function append(nextFiles: File[], source?: StudioReferenceImage['source'], canAppend = () => true) {
    const owner = auth.subject?.id
    const remaining = () => Math.max(0, maxFiles - files.value.length)
    const imageFiles = nextFiles.filter(isImageFile).slice(0, remaining())
    if (!imageFiles.length) return false

    const totalBytes = (images: File[]) => images.reduce((sum, file) => sum + file.size, 0)
    if (totalBytes([...files.value, ...imageFiles]) > MAX_REFERENCE_TOTAL_BYTES) throw new Error('参考图总大小不能超过 100 MB')
    let added = false
    for (const file of imageFiles) {
      const reference = await createStudioReferenceFromFile(file)
      if (!canAppend() || auth.subject?.id !== owner) return added
      if (!remaining() || totalBytes([...files.value, file]) > MAX_REFERENCE_TOTAL_BYTES) return added
      reference.source = source
      files.value.push(file)
      references.value.push(reference)
      added = true
    }
    return added
  }

  async function rememberImageReferences(images: StudioReferenceImage[], originals: File[], keepPreview = false) {
    const owner = auth.subject?.id
    const entries: CachedReference[] = []
    const compact = images.map((image, index) => {
      const file = originals[index]
      const source = image.source && /^https?:|^\//i.test(image.source.src) ? image.source : undefined
      if (!file || image.dataUrl.length <= MAX_SYNCED_STUDIO_REFERENCE_CHARS) return { ...image, source }
      const originalInBrowser = keepPreview ? Boolean(owner) : !source
      if (owner && originalInBrowser) {
        entries.push({ key: JSON.stringify([owner, image.id]), file, savedAt: Date.now() })
      }
      return {
        ...image,
        source,
        dataUrl: keepPreview ? image.dataUrl : '',
        originalInBrowser: originalInBrowser || undefined,
      }
    })
    if (!entries.length) return compact
    try {
      await cacheReferenceFiles(entries)
      return compact
    } catch {
      // Keep the original available until the current tab closes if local storage is unavailable.
      if (keepPreview) return compact.map((image, index) => ({ ...image, originalInBrowser: images[index].originalInBrowser }))
      return compact.map((image, index) => image.originalInBrowser ? { ...image, dataUrl: images[index].dataUrl } : image)
    }
  }

  async function restoreCachedImageReference(image: StudioReferenceImage) {
    const owner = auth.subject?.id
    const file = owner && image.originalInBrowser
      ? await readReferenceFile(JSON.stringify([owner, image.id])).catch(() => undefined)
      : undefined
    if (auth.subject?.id !== owner) throw new Error('登录密钥已切换，请在当前会话重新添加参考图')
    if (!file) throw new Error(`找不到原参考图「${image.name}」。请重新上传原图或用最新结果继续修改。`)
    return file
  }

  async function restoreChatImageReference(image: StudioReferenceImage) {
    if (isInlineImage(image.dataUrl)) return fetchStudioImageFile(image.dataUrl, image.name)
    return restoreCachedImageReference(image)
  }

  async function resolveChatReference(image: StudioReferenceImage, signal?: AbortSignal) {
    signal?.throwIfAborted()
    if (image.dataUrl) return isReplayableChatImage(image.dataUrl) ? image.dataUrl : ''
    const file = await restoreCachedImageReference(image)
    signal?.throwIfAborted()
    if (!file.size || file.type === 'image/svg+xml') return ''
    const dataUrl = await readFileAsDataUrl(file)
    return isReplayableChatImage(dataUrl) ? dataUrl : ''
  }

  async function restoreImageReferences(images: StudioReferenceImage[]) {
    const owner = auth.subject?.id
    const originals = await Promise.all(images.map(async (image) => {
      if (image.dataUrl) return fetchStudioImageFile(image.dataUrl, image.name)
      if (image.source) return fetchStudioImageFile(image.source.src, image.name)
      return restoreCachedImageReference(image)
    }))
    if (auth.subject?.id !== owner) throw new Error('登录密钥已切换，请在当前会话重新添加参考图')
    return originals
  }

  function prepareReferenceRemoval(removedMessages?: StudioMessage[]) {
    const owner = auth.subject?.id
    const removed = removedMessages ? cachedReferenceIds(removedMessages) : undefined
    return (remainingMessages: StudioMessage[] = []) => {
      if (!owner) return
      for (const id of cachedReferenceIds(remainingMessages)) removed?.delete(id)
      void removeCachedReferences(owner, removed).catch(() => {})
    }
  }

  async function replaceWithImageReferences(
    images: StudioReferenceImage[],
    originals: File[],
    firstSource: StudioReferenceImage['source'],
    canReplace: () => boolean,
  ) {
    const restored = await Promise.all(originals.map(async (file, index) => {
      const image = images[index - Number(Boolean(firstSource))]
      return image ? { ...image, dataUrl: image.dataUrl || await readFileAsDataUrl(file) }
        : { ...await createStudioReferenceFromFile(file), source: firstSource }
    }))
    if (!canReplace()) return
    files.value = originals
    references.value = restored
  }

  function remove(index: number) {
    files.value.splice(index, 1)
    references.value.splice(index, 1)
  }

  function clear() {
    files.value = []
    references.value = []
  }

  function open(reference: StudioReference) {
    if (!reference.dataUrl) return
    preview.value = {
      src: reference.dataUrl,
      name: reference.name,
    }
  }

  function openPreview(src: string, name: string, localPath = '') {
    if (!src) return
    preview.value = { src, name, localPath }
  }

  function closePreview() {
    preview.value = null
  }

  return {
    files,
    references,
    preview,
    selectedFiles,
    attachmentNames,
    messageReferenceImages,
    append,
    rememberImageReferences,
    resolveChatReference,
    restoreChatImageReference,
    restoreImageReferences,
    replaceWithImageReferences,
    prepareReferenceRemoval,
    remove,
    clear,
    open,
    openPreview,
    closePreview,
  }
}

function isInlineImage(value: string) {
  return /^data:image\/[^;,]+;base64,/i.test(value)
}

function isReplayableChatImage(value: string) {
  const header = /^data:(image\/[^;,]+|application\/octet-stream);base64,/i.exec(value)
  if (!header || header[1].toLowerCase() === 'image/svg+xml') return false
  const payload = value.slice(header[0].length)
  return payload.length > 0 && payload.length % 4 === 0 && /^[a-z\d+/]+={0,2}$/i.test(payload)
}

export async function fetchStudioImageFile(source: string, filename: string) {
  if (!source) throw new Error('图片没有可读取的地址')
  const url = new URL(source, window.location.href)
  if (url.protocol !== 'http:' && url.protocol !== 'https:' && !/^data:image\//i.test(url.href)) {
    throw new Error('无法读取该图片地址')
  }
  const response = await fetch(url, { credentials: 'same-origin', signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`读取图片失败：HTTP ${response.status}`)
  if (Number(response.headers.get('content-length')) > MAX_REFERENCE_FILE_BYTES) throw new Error('图片超过 50 MB')
  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  if (contentType && !contentType.startsWith('image/')) throw new Error('读取到的内容不是图片')
  const reader = response.body?.getReader()
  if (!reader) throw new Error('读取到的图片为空')
  const chunks: BlobPart[] = []
  let total = 0
  try {
    while (true) {
      const result = await reader.read()
      if (result.done) break
      total += result.value.byteLength
      if (total > MAX_REFERENCE_FILE_BYTES) {
        await reader.cancel()
        throw new Error('图片超过 50 MB')
      }
      chunks.push(result.value)
    }
  } finally {
    reader.releaseLock()
  }
  if (!total) throw new Error('读取到的图片为空')
  return new File(chunks, filename, { type: contentType || 'image/png' })
}
