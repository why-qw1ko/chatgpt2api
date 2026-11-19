export async function writeClipboardText(value: string) {
  const text = String(value ?? '')
  if (!text) throw new Error('Nothing to copy')

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Clipboard API can be unavailable on non-secure self-hosted origins.
    }
  }

  if (typeof document === 'undefined' || !document.body) {
    throw new Error('Clipboard is unavailable')
  }

  const previousActiveElement = document.activeElement
  const scrollX = typeof window !== 'undefined' ? window.scrollX : 0
  const scrollY = typeof window !== 'undefined' ? window.scrollY : 0
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'readonly')
  textarea.setAttribute('aria-hidden', 'true')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '0'
  textarea.style.width = '1px'
  textarea.style.height = '1px'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'
  document.body.appendChild(textarea)

  let copied = false
  try {
    textarea.focus({ preventScroll: true })
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)
    copied = document.execCommand('copy')
  } finally {
    document.body.removeChild(textarea)
    if (
      previousActiveElement
      && previousActiveElement !== document.body
      && previousActiveElement.isConnected
      && 'focus' in previousActiveElement
      && typeof previousActiveElement.focus === 'function'
    ) {
      try {
        previousActiveElement.focus({ preventScroll: true })
      } catch {
        // Focus restoration is best-effort and must not turn a successful copy into a failure.
      }
    }
    if (typeof window !== 'undefined') window.scrollTo(scrollX, scrollY)
  }

  if (!copied) throw new Error('Clipboard copy failed')
}
export async function writeClipboardImage(loadImage: () => Promise<Blob>): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('当前浏览器无法复制图片，请使用下载')
  }

  // Start the clipboard write inside the click gesture, including browsers that expire it during a fetch.
  const png = loadImage().then(async (image) => {
    if (image.type === 'image/png') return image
    const bitmap = await createImageBitmap(image)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('无法转换图片格式')
      context.drawImage(bitmap, 0, 0)
      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('无法转换图片格式')), 'image/png')
      })
    } finally {
      bitmap.close()
    }
  })
  // A rejected permission check can finish before the image request.
  void png.catch(() => {})
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
}
