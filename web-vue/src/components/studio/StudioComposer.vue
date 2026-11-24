<template>
  <footer class="studio-composer-shell">
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      @change="handleFileChange"
    />

    <form
      class="chat-input-panel"
      :class="{ 'is-dragging': isDragging }"
      @submit.prevent="$emit('submit')"
      @dragenter.prevent="handleDragEnter"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <div class="chat-input-panel-shell" @click.self="focusInput">
        <SegmentedTabs
          :model-value="mode"
          :options="modeOptions"
          class="chat-mode-control"
          aria-label="创作模式"
          @update:model-value="selectMode"
        />

        <div class="chat-input-panel-inner" @click.self="focusInput">
          <div v-if="isEditing" class="chat-editing-bar">
            <div class="chat-editing-info">
              <Icon icon="lucide:pencil" class="h-3.5 w-3.5" />
              <span>正在编辑原消息，发送后会替换该消息并重新生成后续回复。</span>
            </div>
            <Button size="xs" variant="ghost" @click="$emit('cancel-edit')">
              取消
            </Button>
          </div>

          <div v-if="canAttachReferences && references.length" class="attach-images">
            <div v-for="(source, index) in references" :key="source.id" class="chat-attachment-preview">
              <button type="button" class="studio-reference-preview" :aria-label="`预览 ${source.name}`" :title="source.name" @click="$emit('preview-reference', source)">
                <img v-if="source.dataUrl" :src="source.dataUrl" :alt="source.name" />
                <Icon v-else icon="lucide:image" class="h-5 w-5" />
              </button>
              <button type="button" class="chat-attachment-remove" :aria-label="`移除 ${source.name}`" @click="$emit('remove-reference', index)">
                <Icon icon="lucide:x" class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <textarea
            ref="textareaRef"
            v-model="textValue"
            class="chat-input custom-scrollbar"
            rows="1"
            aria-label="创作内容"
            :placeholder="placeholderText"
            @input="resizeTextarea"
            @paste="handlePaste"
            @keydown.enter.exact="submitOnEnter"
          ></textarea>
        </div>

        <div class="chat-input-actions">
          <div class="chat-input-action-row">
            <Button
              icon-only
              size="sm"
              :disabled="isSending"
              aria-label="上传图片"
              title="上传图片"
              @click="handleAttachReferenceClick"
            >
              <Icon icon="lucide:image-plus" class="h-4 w-4" aria-hidden="true" />
            </Button>

            <StudioToolbarSelectButton
              v-if="mode === 'image'"
              :disabled="isSending"
              @click="handleOpenPrompts"
            >
              <Icon icon="lucide:book-open" class="h-3.5 w-3.5" aria-hidden="true" />
              <span>提示词</span>
            </StudioToolbarSelectButton>

            <StudioToolbarSelectButton
              v-if="mode === 'search'"
              :disabled="isSending"
              title="搜索 Skill"
              @click="handleOpenSearchSkill"
            >
              <Icon icon="lucide:package-plus" class="h-3.5 w-3.5" aria-hidden="true" />
              <span>Skill</span>
            </StudioToolbarSelectButton>

            <template v-if="mode === 'chat'">
              <div class="chat-settings-anchor--chat">
                <FloatingActionMenu
                  :label="chatSettingsLabel"
                  :items="chatSettingsMenuItems"
                  align="left"
                  placement="top"
                  trigger-variant="input"
                  trigger-class="chat-model-button"
                  :menu-min-width="220"
                  @select="handleChatSettingsMenuSelect"
                />
              </div>
            </template>

            <template v-else-if="mode === 'image'">
              <ElPopover
                v-model:visible="settingsOpen"
                trigger="click"
                role="dialog"
                aria-label="图片设置"
                placement="top-end"
                :width="384"
                :offset="8"
                :show-arrow="false"
                :teleported="true"
                :persistent="false"
                :popper-options="{ modifiers: [{ name: 'preventOverflow', options: { padding: 12, altAxis: true, tether: false } }] }"
                :popper-style="{ maxWidth: 'calc(100vw - 24px)', padding: '0' }"
                @after-enter="focusImageSettings"
              >
                <template #reference>
                  <Button
                    ref="imageSettingsTrigger"
                    root-class="chat-summary-button"
                    size="sm"
                    :aria-label="`图片设置，${imageSummaryLabel}`"
                    aria-haspopup="dialog"
                    :aria-expanded="settingsOpen"
                    :aria-controls="settingsOpen ? imageSettingsId : undefined"
                    :title="`图片设置，${imageSummaryLabel}`"
                    @keydown.esc.stop.prevent="closeImageSettings"
                  >
                    <Icon icon="lucide:sliders-horizontal" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span class="chat-summary-label">{{ imageSummaryLabel }}</span>
                    <Icon
                      icon="lucide:chevron-down"
                      class="chat-summary-caret h-3.5 w-3.5 shrink-0"
                      :class="{ 'is-open': settingsOpen }"
                      aria-hidden="true"
                    />
                  </Button>
                </template>

                <section
                  :id="imageSettingsId"
                  ref="imageSettingsPanel"
                  class="studio-size-popover"
                  tabindex="-1"
                  aria-label="图片设置"
                  @keydown.esc.capture="handleImageSettingsEscape"
                >
                  <header class="studio-size-heading">
                    <h2>图片设置</h2>
                    <CloseButton label="关闭图片设置" @click="closeImageSettings" />
                  </header>

                  <div class="studio-size-fields">
                    <div class="studio-size-section">
                      <p class="studio-size-label">模型</p>
                      <GroupedSelectMenu
                        v-model="imageModelValue"
                        :options="imageModelSelectOptions"
                        :append-to="imageSettingsPanel ?? undefined"
                        selected-indicator="none"
                        aria-label="图片模型"
                        block
                      />
                    </div>
                    <fieldset class="studio-size-section">
                      <legend class="studio-size-label">质量</legend>
                      <div class="studio-choice-grid">
                        <Button
                          v-for="option in IMAGE_QUALITY_OPTIONS"
                          :key="option.value"
                          size="xs"
                          :variant="imageForm.quality === option.value ? 'primary' : 'outline'"
                          :aria-pressed="imageForm.quality === option.value"
                          block
                          root-class="studio-choice-button"
                          @click="$emit('update:imageQuality', option.value)"
                        >
                          {{ option.label }}
                        </Button>
                      </div>
                    </fieldset>
                    <fieldset class="studio-size-section">
                      <legend class="studio-size-label">数量</legend>
                      <div class="studio-choice-grid">
                        <Button
                          v-for="option in IMAGE_COUNT_OPTIONS"
                          :key="option.value"
                          size="xs"
                          :variant="imageForm.n === option.value ? 'primary' : 'outline'"
                          :aria-pressed="imageForm.n === option.value"
                          block
                          root-class="studio-choice-button"
                          @click="$emit('update:imageCount', option.value)"
                        >
                          {{ option.label }}
                        </Button>
                      </div>
                    </fieldset>
                    <fieldset class="studio-size-section">
                      <legend class="studio-size-label">比例</legend>
                      <div class="studio-choice-grid">
                        <Button
                          v-for="option in ratioOptions"
                          :key="option.value"
                          size="xs"
                          :variant="selectedRatio === option.value ? 'primary' : 'outline'"
                          :aria-pressed="selectedRatio === option.value"
                          block
                          root-class="studio-choice-button"
                          @click="selectRatio(option.value)"
                        >
                          {{ option.label }}
                        </Button>
                      </div>
                    </fieldset>
                    <fieldset class="studio-size-section">
                      <legend class="studio-size-label">分辨率</legend>
                      <div class="studio-choice-grid">
                        <Button
                          v-for="option in resolutionOptions"
                          :key="option.value"
                          size="xs"
                          :variant="selectedResolution === option.value ? 'primary' : 'outline'"
                          :aria-pressed="selectedResolution === option.value"
                          block
                          root-class="studio-choice-button"
                          @click="selectResolution(option.value)"
                        >
                          {{ option.label }}
                        </Button>
                      </div>
                      <p class="studio-size-current">{{ selectedSizeDetailLabel }}</p>
                    </fieldset>
                  </div>
                </section>
              </ElPopover>
            </template>

            <template v-else-if="mode === 'file'">
              <div class="chat-select-wrap--file">
                <GroupedSelectMenu
                  v-model="fileKindValue"
                  :options="fileKindOptions"
                  placement="top"
                  selected-indicator="none"
                  aria-label="选择文件类型"
                  block
                />
              </div>
              <StudioToolbarSelectButton
                :disabled="isSending"
                title="最近文件任务"
                @click="handleOpenRecentFileTasks"
              >
                <Icon icon="lucide:history" class="h-3.5 w-3.5" aria-hidden="true" />
                <span>最近</span>
              </StudioToolbarSelectButton>
            </template>
          </div>

          <div class="chat-input-submit-row">
            <Button
              v-if="isStreaming"
              size="sm"
              variant="danger"
              root-class="chat-input-send"
              aria-label="停止输出"
              @click="$emit('stop')"
            >
              <Icon icon="lucide:square" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>停止</span>
            </Button>
            <Button
              v-else
              type="submit"
              size="sm"
              variant="primary"
              root-class="chat-input-send"
              :disabled="isSending || isRestoringHistory || !text.trim()"
              :loading="isSending || isRestoringHistory"
              :aria-label="submitAriaLabel"
            >
              <Icon
                v-if="!isSending && !isRestoringHistory"
                :icon="!isEditing && isGenerationMode ? 'lucide:sparkle' : 'lucide:send-horizontal'"
                class="h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              <span>{{ submitLabel }}</span>
            </Button>
          </div>
        </div>
      </div>

      <div v-if="isDragging" class="studio-drop-overlay">
        <Icon icon="lucide:image-plus" class="h-5 w-5" />
        松开以添加参考图
      </div>
    </form>
  </footer>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ElPopover } from 'element-plus'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { Button, CloseButton, GroupedSelectMenu, SegmentedTabs, type ActionMenuItem } from '@/components/ui'
import FloatingActionMenu from '@/components/ai/FloatingActionMenu.vue'
import StudioToolbarSelectButton from '@/components/studio/StudioToolbarSelectButton.vue'
import {
  DEFAULT_IMAGE_SIZE,
  IMAGE_COUNT_OPTIONS,
  IMAGE_QUALITY_OPTIONS,
  formatImageSizeLabel,
  resolveImageSizePresets,
  type ImageSizeResolution,
} from '@/api/imageTasks'
import type { StudioComposeMode, StudioFileKind, StudioImageForm, StudioReference } from './types'

type ComposerMenuItem = ActionMenuItem & {
  active?: boolean
  children?: ComposerMenuItem[]
}

const props = defineProps<{
  mode: StudioComposeMode
  fileKind: StudioFileKind
  text: string
  chatModel: string
  chatReasoningEffort: string
  imageForm: StudioImageForm
  chatModelOptions: string[]
  imageModelOptions: string[]
  imageHighResolutionEnabled: boolean
  references: StudioReference[]
  isSending: boolean
  isRestoringHistory: boolean
  isStreaming: boolean
  isEditing: boolean
}>()

const emit = defineEmits<{
  'update:mode': [mode: StudioComposeMode]
  'update:fileKind': [kind: StudioFileKind]
  'update:text': [text: string]
  'update:chatModel': [model: string]
  'update:chatReasoningEffort': [effort: string]
  'update:imageModel': [model: string]
  'update:imageSize': [size: string]
  'update:imageQuality': [quality: string]
  'update:imageCount': [count: number]
  submit: []
  stop: []
  'cancel-edit': []
  'add-files': [files: File[]]
  'remove-reference': [index: number]
  'clear-references': []
  'preview-reference': [reference: StudioReference]
  'open-prompts': []
  'open-search-skill': []
  'open-recent-file-tasks': []
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const imageSettingsTrigger = ref<InstanceType<typeof Button> | null>(null)
const imageSettingsPanel = ref<HTMLElement | null>(null)
const imageSettingsId = useId()
const isDragging = ref(false)
const settingsOpen = ref(false)
let textareaResizeFrame = 0

const modeOptions: Array<{ label: string; value: StudioComposeMode }> = [
  { label: '对话', value: 'chat' },
  { label: '画图', value: 'image' },
  { label: '搜索', value: 'search' },
  { label: '文件', value: 'file' },
]

const fileKindOptions: Array<{ label: string; value: StudioFileKind }> = [
  { label: 'PPT', value: 'ppt' },
  { label: 'PSD', value: 'psd' },
]

const textValue = computed({
  get: () => props.text,
  set: (value: string) => emit('update:text', value),
})

const chatModelValue = computed({
  get: () => props.chatModel,
  set: (value: string | string[]) => emit('update:chatModel', String(Array.isArray(value) ? value[0] : value || 'auto')),
})

const chatReasoningEffortValue = computed({
  get: () => props.chatReasoningEffort || 'default',
  set: (value: string | string[]) => {
    const next = String(Array.isArray(value) ? value[0] : value || 'default')
    emit('update:chatReasoningEffort', next === 'default' ? '' : next)
  },
})

const fileKindValue = computed({
  get: () => props.fileKind,
  set: (value: string | string[]) => {
    const next = String(Array.isArray(value) ? value[0] : value || props.fileKind)
    if (next === 'ppt' || next === 'psd') emit('update:fileKind', next)
  },
})

const imageModelValue = computed({
  get: () => props.imageForm.model,
  set: (value: string | string[]) => emit('update:imageModel', String(Array.isArray(value) ? value[0] : value || '')),
})

const chatModelSelectOptions = computed(() => props.chatModelOptions.map((model) => ({
  label: model === 'auto' ? '自动模型' : model,
  value: model,
})))

const chatReasoningEffortOptions = [
  { label: '默认', value: 'default' },
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' },
  { label: '超高', value: 'extended' },
]

const imageModelSelectOptions = computed(() => props.imageModelOptions.map((model) => ({
  label: model,
  value: model,
})))

const sizePresets = computed(() => resolveImageSizePresets(props.imageHighResolutionEnabled))
const selectedPreset = computed(() => sizePresets.value.find((preset) => preset.value === props.imageForm.size))
const selectedRatio = computed(() => selectedPreset.value?.ratio || 'auto')
const selectedResolution = computed(() => selectedPreset.value?.resolution || 'auto')
const ratioOptions = computed(() => {
  const seen = new Set<string>()
  return sizePresets.value
    .filter((preset) => {
      if (seen.has(preset.ratio)) return false
      seen.add(preset.ratio)
      return true
    })
    .map((preset) => ({ label: preset.ratio === 'auto' ? '自动' : preset.ratio, value: preset.ratio }))
})
const resolutionOptions = computed(() => {
  const order: ImageSizeResolution[] = ['auto', '1K', '2K', '4K']
  const values = new Set(sizePresets.value.map((preset) => preset.resolution))
  return order.filter((value) => values.has(value)).map((value) => ({ label: value === 'auto' ? '自动' : value, value }))
})
const selectedSizeDetailLabel = computed(() => formatImageSizeLabel(props.imageForm.size))
const canAttachReferences = computed(() => props.mode === 'image' || props.mode === 'chat' || props.mode === 'file')
const selectedChatModelLabel = computed(() => chatModelSelectOptions.value.find((option) => option.value === props.chatModel)?.label || props.chatModel || '自动模型')
const selectedReasoningEffortLabel = computed(() => {
  const current = props.chatReasoningEffort || 'default'
  return chatReasoningEffortOptions.find((option) => option.value === current)?.label || current
})
const chatSettingsLabel = computed(() => {
  const model = compactModelLabel(props.chatModel)
  const reasoning = selectedReasoningEffortLabel.value
  return reasoning === '默认' ? model : `${model} ${reasoning}`
})
const chatSettingsMenuItems = computed<ComposerMenuItem[]>(() => [
  {
    key: 'reasoning-heading',
    label: '推理',
    heading: true,
  },
  ...chatReasoningEffortOptions.map((option) => ({
    key: `reasoning:${option.value}`,
    label: option.label,
    active: (props.chatReasoningEffort || 'default') === option.value,
  })),
  {
    key: 'model-menu',
    label: selectedChatModelLabel.value,
    dividerBefore: true,
    children: [
      { key: 'model-heading', label: '模型', heading: true },
      ...chatModelSelectOptions.value.map((option) => ({
        key: `model:${option.value}`,
        label: option.label,
        active: props.chatModel === option.value,
      })),
    ],
  },
])
const imageSummaryLabel = computed(() => {
  const preset = selectedPreset.value
  const size = preset && preset.ratio !== 'auto'
    ? `${preset.ratio} · ${preset.resolution}`
    : formatImageSizeLabel(props.imageForm.size, '自动尺寸')
  const count = props.imageForm.n > 1 ? ` · ${props.imageForm.n} 张` : ''
  return `${size}${count}`
})
const imagePlaceholder = computed(() => props.references.length ? '描述你想如何修改参考图' : '描述你想生成的画面，或添加参考图')
const chatPlaceholder = computed(() => props.references.length ? '描述你想让模型识别或分析的图片' : '输入消息，Enter 发送，Shift+Enter 换行')
const filePlaceholder = computed(() => {
  const kind = props.fileKind === 'psd' ? 'PSD' : 'PPT'
  return props.references.length
    ? `描述你想根据参考图生成的 ${kind}`
    : `描述你想生成的 ${kind}，也可以粘贴或拖入参考图`
})
const placeholderText = computed(() => {
  if (props.mode === 'image') return imagePlaceholder.value
  if (props.mode === 'file') return filePlaceholder.value
  if (props.mode === 'search') return '输入搜索问题，Enter 搜索，Shift+Enter 换行'
  return chatPlaceholder.value
})
const submitAriaLabel = computed(() => {
  if (props.isRestoringHistory) return '正在加载历史对话'
  if (props.isEditing) return '保存修改'
  if (props.mode === 'image') return '提交图片任务'
  if (props.mode === 'file') return `生成 ${props.fileKind === 'psd' ? 'PSD' : 'PPT'}`
  if (props.mode === 'search') return '搜索'
  return '发送消息'
})
const isGenerationMode = computed(() => props.mode === 'image' || props.mode === 'file')
const submitLabel = computed(() => {
  if (props.isRestoringHistory) return '加载历史'
  if (props.isEditing) return '保存'
  if (isGenerationMode.value) return '生成'
  return props.mode === 'search' ? '搜索' : '发送'
})

function selectMode(mode: string | number) {
  if (mode === 'chat' || mode === 'search' || mode === 'image' || mode === 'file') {
    closeFloatingMenus()
    emit('update:mode', mode)
  }
}

function focusImageSettings() {
  imageSettingsPanel.value?.focus({ preventScroll: true })
}

function closeImageSettings() {
  if (!settingsOpen.value) return
  closeFloatingMenus()
  imageSettingsTrigger.value?.focus()
}

function handleImageSettingsEscape(event: KeyboardEvent) {
  const target = event.target
  if (target instanceof HTMLElement && target.matches('[role="combobox"][aria-expanded="true"]')) return
  event.preventDefault()
  event.stopPropagation()
  closeImageSettings()
}

function closeFloatingMenus() {
  settingsOpen.value = false
}

function handleOpenPrompts() {
  closeFloatingMenus()
  emit('open-prompts')
}

function handleOpenSearchSkill() {
  closeFloatingMenus()
  emit('open-search-skill')
}

function handleOpenRecentFileTasks() {
  closeFloatingMenus()
  emit('open-recent-file-tasks')
}

function handleAttachReferenceClick() {
  closeFloatingMenus()
  if (props.mode === 'search') {
    emit('update:mode', 'chat')
    void nextTick(() => fileInputRef.value?.click())
    return
  }
  fileInputRef.value?.click()
}

function handleChatSettingsMenuSelect(key: string) {
  closeFloatingMenus()
  if (key.startsWith('reasoning:')) {
    chatReasoningEffortValue.value = key.slice('reasoning:'.length)
  } else if (key.startsWith('model:')) {
    chatModelValue.value = key.slice('model:'.length)
  }
}

function compactModelLabel(model: string) {
  const normalized = String(model || '').trim()
  if (!normalized || normalized === 'auto') return '自动'
  return normalized.replace(/^gpt-/i, '')
}

function focusInput() {
  textareaRef.value?.focus({ preventScroll: true })
}

defineExpose({ focusInput })

function submitOnEnter(event: KeyboardEvent) {
  if (event.isComposing || event.keyCode === 229) return
  event.preventDefault()
  if (props.isRestoringHistory) return
  emit('submit')
}

function resizeTextarea() {
  if (typeof window === 'undefined') return
  if (textareaResizeFrame) window.cancelAnimationFrame(textareaResizeFrame)
  textareaResizeFrame = window.requestAnimationFrame(() => {
    textareaResizeFrame = 0
    const element = textareaRef.value
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  })
}

function scheduleTextareaResize() {
  void nextTick(resizeTextarea)
}

function selectRatio(ratio: string) {
  const auto = sizePresets.value.find((preset) => preset.value === DEFAULT_IMAGE_SIZE)
  if (ratio === 'auto') {
    emit('update:imageSize', auto?.value || DEFAULT_IMAGE_SIZE)
    return
  }
  const exact = selectedResolution.value !== 'auto'
    ? sizePresets.value.find((preset) => preset.ratio === ratio && preset.resolution === selectedResolution.value)
    : undefined
  const next = exact || sizePresets.value.find((preset) => preset.ratio === ratio) || auto
  emit('update:imageSize', next?.value || DEFAULT_IMAGE_SIZE)
}

function selectResolution(resolution: ImageSizeResolution) {
  const auto = sizePresets.value.find((preset) => preset.value === DEFAULT_IMAGE_SIZE)
  if (resolution === 'auto') {
    emit('update:imageSize', auto?.value || DEFAULT_IMAGE_SIZE)
    return
  }
  const exact = selectedRatio.value !== 'auto'
    ? sizePresets.value.find((preset) => preset.ratio === selectedRatio.value && preset.resolution === resolution)
    : undefined
  const next = exact || sizePresets.value.find((preset) => preset.resolution === resolution) || auto
  emit('update:imageSize', next?.value || DEFAULT_IMAGE_SIZE)
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  emit('add-files', Array.from(input.files || []))
  input.value = ''
}

function handlePaste(event: ClipboardEvent) {
  if (!canAttachReferences.value) return
  const files = Array.from(event.clipboardData?.files || []).filter(isImageFile)
  if (!files.length) return
  event.preventDefault()
  emit('add-files', files)
}

function handleDragEnter() {
  if (canAttachReferences.value) isDragging.value = true
}

function handleDragOver() {
  if (canAttachReferences.value) isDragging.value = true
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  if (!canAttachReferences.value) return
  emit('add-files', Array.from(event.dataTransfer?.files || []))
}

function handleDragLeave(event: DragEvent) {
  const current = event.currentTarget as HTMLElement
  if (event.relatedTarget instanceof Node && current.contains(event.relatedTarget)) return
  isDragging.value = false
}

function isImageFile(file: File) {
  return file.type.startsWith('image/') || /\.(avif|bmp|gif|heic|heif|ico|jpe?g|png|svg|tiff?|webp)$/i.test(file.name)
}

onMounted(scheduleTextareaResize)

watch(
  () => [props.text, props.mode, props.references.length, props.isEditing],
  scheduleTextareaResize,
  { flush: 'post' },
)

watch(
  () => props.mode,
  () => closeFloatingMenus(),
)

onBeforeUnmount(() => {
  if (textareaResizeFrame) window.cancelAnimationFrame(textareaResizeFrame)
})
</script>

<style scoped>
.studio-composer-shell {
  position: relative;
  z-index: 2;
  min-width: 0;
  flex: 0 0 auto;
  padding: 8px var(--studio-content-gutter, 24px) max(12px, env(safe-area-inset-bottom));
}

.chat-input-panel {
  position: relative;
  width: min(100%, var(--studio-content-width, 48rem));
  margin-inline: auto;
}

.chat-input-panel-shell {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--card));
  padding: 12px;
  transition: border-color var(--motion-fast) var(--ease-out-soft), box-shadow var(--motion-fast) var(--ease-out-soft);
}

.chat-input-panel-shell:focus-within,
.chat-input-panel-shell:has(.chat-summary-button[aria-expanded="true"]) {
  border-color: hsl(var(--input));
}

.chat-input-panel-shell:has(.chat-input:focus),
.is-dragging .chat-input-panel-shell {
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 2px hsl(var(--ring) / 0.14);
}

.chat-mode-control {
  width: fit-content;
}

.chat-editing-bar {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: hsl(var(--secondary));
  padding: 4px 8px;
  color: hsl(var(--secondary-foreground));
  font-size: 0.75rem;
  line-height: 1rem;
}

.chat-editing-info {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.chat-editing-info svg {
  flex-shrink: 0;
}

.chat-editing-info span {
  overflow-wrap: anywhere;
}

.chat-input-panel-inner {
  min-width: 0;
}

.chat-input {
  display: block;
  width: 100%;
  min-height: 3.5rem;
  max-height: clamp(3.5rem, 24dvh, 9rem);
  resize: none;
  overflow-y: auto;
  border: 0;
  border-radius: 8px;
  background: transparent;
  padding: 8px 4px;
  color: hsl(var(--foreground));
  font-size: 1rem;
  line-height: 1.5rem;
  outline: none;
}

.chat-input::placeholder {
  color: hsl(var(--muted-foreground));
  opacity: 1;
}

.attach-images {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
  padding: 2px;
  overflow-x: auto;
}

.chat-attachment-preview {
  position: relative;
  width: 3.5rem;
  height: 3.5rem;
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.studio-reference-preview {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}

.studio-reference-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-attachment-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  display: grid;
  width: 1.5rem;
  height: 1.5rem;
  place-items: center;
  border-radius: 6px;
  background: rgb(15 23 42 / 0.86);
  color: #fff;
  transition: opacity var(--motion-fast) var(--ease-out-soft), background-color var(--motion-fast) var(--ease-out-soft), color var(--motion-fast) var(--ease-out-soft);
}

.chat-attachment-remove:hover {
  background: hsl(var(--tone-error-bg));
  color: hsl(var(--tone-error-foreground));
}

@media (hover: hover) and (pointer: fine) {
  .chat-attachment-remove {
    opacity: 0;
  }

  .chat-attachment-preview:is(:hover, :focus-within) .chat-attachment-remove {
    opacity: 1;
  }
}

.studio-reference-preview:focus-visible,
.chat-attachment-remove:focus-visible {
  outline-offset: -2px;
}

.chat-input-actions,
.chat-input-action-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.chat-input-actions {
  align-items: flex-end;
  justify-content: space-between;
}

.chat-input-action-row {
  flex: 1 1 auto;
  flex-wrap: wrap;
  column-gap: 4px;
  row-gap: 4px;
}

.chat-input-submit-row {
  flex: 0 0 auto;
}

.chat-input-submit-row :deep(.chat-input-send) {
  justify-content: center;
  padding-inline: 12px;
  font-weight: 600;
}

.chat-settings-anchor--chat {
  min-width: 0;
  max-width: min(15rem, 100%);
}

.chat-settings-anchor--chat :deep(.chat-model-button),
.chat-settings-anchor--chat :deep(.chat-model-button > span) {
  max-width: 100%;
  overflow: hidden;
}

.chat-select-wrap--file {
  width: 5rem;
}

.chat-summary-label {
  max-width: min(9rem, 34vw);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-summary-caret {
  transition: transform var(--motion-fast) var(--ease-spring);
}

.chat-summary-caret.is-open {
  transform: rotate(180deg);
}

.studio-size-popover {
  display: flex;
  max-height: min(30rem, calc(100dvh - 6rem));
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px 16px;
  border-radius: 8px;
  color: hsl(var(--foreground));
}

.studio-size-popover:focus {
  outline: none;
}

.studio-size-heading {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.studio-size-heading h2 {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.5rem;
  letter-spacing: normal;
}

.studio-size-fields {
  display: grid;
  min-height: 0;
  align-content: start;
  gap: 12px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px;
}

.studio-size-section {
  min-width: 0;
}

.studio-size-label {
  margin-bottom: 4px;
  color: hsl(var(--muted-foreground));
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1rem;
}

.studio-choice-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
}

.studio-choice-grid.is-resolution {
  grid-template-columns: repeat(auto-fit, minmax(3rem, 1fr));
}

.studio-choice-grid :deep(.studio-choice-button) {
  min-width: 0;
  padding-inline: 4px;
}

.studio-size-current {
  margin-top: 8px;
  color: hsl(var(--muted-foreground));
  font-size: 0.75rem;
  line-height: 1rem;
}

.studio-drop-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  pointer-events: none;
  border-radius: 8px;
  background: hsl(var(--secondary) / 0.96);
  color: hsl(var(--secondary-foreground));
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25rem;
}

@media (max-height: 550px) {
  .chat-attachment-preview {
    width: 2.5rem;
    height: 2.5rem;
  }
}

@media (max-height: 440px) {
  .studio-composer-shell {
    display: flex;
    max-height: 100%;
    flex-direction: column;
    padding-block: 4px max(8px, env(safe-area-inset-bottom));
  }

  .chat-input-panel,
  .chat-input-panel-shell,
  .chat-input-panel-inner {
    min-height: 0;
  }

  .chat-input-panel {
    display: flex;
    flex-direction: column;
  }

  .chat-input-panel-shell {
    gap: 4px;
    padding: 8px;
  }

  .chat-mode-control,
  .chat-input-actions {
    flex-shrink: 0;
  }

  .chat-input-panel-inner {
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .chat-input {
    min-height: 2.5rem;
    max-height: none;
    overflow-y: hidden;
  }
}

@media (max-width: 380px) {
  .chat-input-actions {
    gap: 4px;
  }

  .chat-input-submit-row :deep(.chat-input-send) {
    padding-inline: 8px;
  }

  .chat-summary-label {
    max-width: 5rem;
  }
}
</style>
