<template>
  <ModalShell
    :open="Boolean(file)"
    aria-label="图片预览"
    close-on-overlay
    close-on-escape
    overlay-class="lightbox"
    root-class="lightbox-content"
    size-class="lightbox-dialog"
    max-width="92vw"
    :z-index="420"
    bare
    @close="emit('close')"
  >
    <template v-if="file">
      <CloseButton class="lightbox-close" label="关闭预览" tone="dark" @click="emit('close')" />
      <img
        :src="imageUrl"
        :alt="file.filename"
        class="lightbox-media"
      />
      <div class="lightbox-info">
        <span class="lightbox-name" :title="file.path">{{ file.filename }}</span>
        <span v-if="sizeLabel" class="lightbox-meta">{{ sizeLabel }}</span>
        <span v-if="file.created_at" class="lightbox-meta">{{ file.created_at }}</span>
        <div class="lightbox-actions">
          <button v-if="canShowDownload" class="lightbox-btn" @click="emitFile('download')">
            <Icon icon="lucide:download" />
            下载
          </button>
          <button v-if="canShowCopy" class="lightbox-btn" @click="emitFile('copy')">
            <Icon :icon="copied ? 'lucide:check' : 'lucide:copy'" />
            {{ copied ? '已复制' : '复制链接' }}
          </button>
          <button v-if="canShowTag" class="lightbox-btn" @click="emitFile('edit-tags')">
            <Icon icon="lucide:tag" />
            标签
          </button>
        </div>
      </div>
    </template>
  </ModalShell>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { CloseButton, ModalShell } from '@/components/ui'
import type { GalleryFile } from '@/api/gallery'

const props = withDefaults(defineProps<{
  file: GalleryFile | null
  imageUrl: string
  sizeLabel: string
  copied: boolean
  showActions?: boolean
  showDownloadAction?: boolean
  showCopyAction?: boolean
  showTagAction?: boolean
}>(), {
  showActions: true,
  showDownloadAction: true,
  showCopyAction: true,
  showTagAction: true,
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'download', file: GalleryFile): void
  (e: 'copy', file: GalleryFile): void
  (e: 'edit-tags', file: GalleryFile): void
}>()

const canShowDownload = computed(() => props.showActions && props.showDownloadAction)
const canShowCopy = computed(() => props.showActions && props.showCopyAction)
const canShowTag = computed(() => props.showActions && props.showTagAction)

function emitFile(event: 'download' | 'copy' | 'edit-tags') {
  if (!props.file) return
  emit(event, props.file)
}
</script>

<style scoped>
:global(.lightbox) {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(2, 14, 24, 0.62);
  backdrop-filter: blur(14px) saturate(1.15);
  animation: lightbox-fade 180ms var(--ease-out-soft);
}

:global(.lightbox .el-overlay-dialog) {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

:global(.lightbox .el-dialog) {
  width: fit-content !important;
  max-width: 92vw;
  margin: 0 auto !important;
  background: transparent;
  box-shadow: none;
  border-radius: 0;
  overflow: visible;
}

:global(.lightbox .el-dialog__body) {
  padding: 0;
  display: flex;
  width: 100%;
  justify-content: center;
}

:global(.lightbox-content) {
  position: relative;
  display: flex;
  width: fit-content;
  max-width: 92vw;
  max-height: 92vh;
  flex-direction: column;
  align-items: center;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  animation: lightbox-rise 240ms var(--ease-spring);
}

.lightbox-close {
  position: absolute;
  top: -44px;
  right: -4px;
  z-index: 2;
}

.lightbox-media {
  display: block;
  width: auto;
  height: auto;
  max-width: min(88vw, 80rem);
  max-height: min(78vh, 80rem);
  border-radius: 16px;
  object-fit: contain;
  background: rgba(255, 255, 255, 0.04);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.38);
}

.lightbox-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px 14px;
  margin-top: 14px;
  padding: 10px 14px;
  max-width: min(88vw, 80rem);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(8, 22, 34, 0.55);
  backdrop-filter: blur(12px);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.82);
  animation: lightbox-rise 280ms var(--ease-spring) 40ms both;
}

.lightbox-name {
  max-width: 18rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #fff;
  font-weight: 600;
}

.lightbox-meta {
  opacity: 0.72;
  font-variant-numeric: tabular-nums;
}

.lightbox-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.lightbox-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: white;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 140ms var(--ease-out-soft), border-color 140ms var(--ease-out-soft), transform 140ms var(--ease-out-soft);
}

.lightbox-btn:hover {
  border-color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.16);
  transform: translateY(-1px);
}

.lightbox-btn:active {
  transform: translateY(0) scale(0.98);
}

@keyframes lightbox-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes lightbox-rise {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (max-width: 720px) {
  :global(.lightbox) {
    padding: 16px;
    align-items: flex-end;
  }

  .lightbox-media {
    max-width: calc(100vw - 32px);
    max-height: 68vh;
    border-radius: 12px;
  }

  .lightbox-close {
    top: -40px;
    right: 0;
  }

  .lightbox-info {
    width: 100%;
    max-width: calc(100vw - 32px);
    border-radius: 14px;
    justify-content: flex-start;
  }

  .lightbox-name {
    max-width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  :global(.lightbox),
  :global(.lightbox-content),
  .lightbox-info {
    animation: none;
  }
}
</style>
