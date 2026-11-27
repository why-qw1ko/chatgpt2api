<template>
  <GalleryLightbox
    :file="lightboxFile"
    :image-url="preview?.src || ''"
    size-label=""
    :copied="false"
    :show-actions="true"
    :show-tag-action="false"
    copy-label="复制图片"
    :show-copy-link-action="canCopyLink"
    @close="$emit('close')"
    @copy="copyPreview"
    @copy-link="copyPreviewLink"
    @download="$emit('download')"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import GalleryLightbox from '@/components/ai/GalleryLightbox.vue'
import type { GalleryFile } from '@/api/gallery'
import type { StudioPreviewImage } from './types'

const props = defineProps<{
  preview: StudioPreviewImage | null
}>()

const emit = defineEmits<{
  close: []
  'copy-image': [preview: StudioPreviewImage]
  'copy-link': [preview: StudioPreviewImage]
  download: []
}>()

const lightboxFile = computed<GalleryFile | null>(() => {
  const preview = props.preview
  if (!preview) return null
  return {
    id: preview.localPath || preview.src,
    filename: preview.name || 'studio-preview-image',
    path: preview.localPath || preview.src,
    url: preview.src,
    thumbnail_url: preview.src,
    size_bytes: 0,
    created_at: '',
    date: '',
    media_type: 'image',
    expired: false,
    expires_at: null,
    expires_in_seconds: null,
    tags: [],
    storage: 'studio',
    local: Boolean(preview.localPath),
    webdav: false,
    available: true,
    width: null,
    height: null,
    genbox_push: null,
  }
})

const canCopyLink = computed(() => Boolean(props.preview?.localPath || /^https?:|^\//i.test(props.preview?.src || '')))

function copyPreview() {
  if (props.preview) emit('copy-image', props.preview)
}

function copyPreviewLink() {
  if (props.preview) emit('copy-link', props.preview)
}
</script>
