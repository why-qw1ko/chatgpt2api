<template>
  <PagePanel class="theme-panel">
    <PanelHeader page title="主题切换" />

    <section class="theme-section" aria-labelledby="theme-mode-title">
      <h2 id="theme-mode-title" class="ui-section-title">显示模式</h2>
      <SegmentedTabs
        :model-value="themeMode"
        :options="modeOptions"
        aria-label="显示模式"
        @update:model-value="setThemeMode($event === 'dark' ? 'dark' : 'light')"
      />
    </section>

    <section class="theme-section" aria-labelledby="theme-accent-title">
      <div>
        <h2 id="theme-accent-title" class="ui-section-title">强调色</h2>
        <p class="mt-1 text-sm text-muted-foreground">应用于按钮、选中项和复选框，自动适配亮暗模式。</p>
      </div>
      <div class="theme-presets" role="group" aria-label="预设配色">
        <Button
          v-for="preset in themePresets"
          :key="preset.color"
          size="md"
          root-class="theme-preset"
          :aria-pressed="themeAccent === preset.color"
          @click="setThemeAccent(preset.color)"
        >
          <span class="theme-swatch" :style="{ backgroundColor: preset.color }" aria-hidden="true" />
          <span>{{ preset.label }}</span>
        </Button>
      </div>
      <div class="theme-custom">
        <ElColorPicker
          :model-value="themeAccent"
          color-format="hex"
          aria-label="选择自定义强调色"
          @change="setThemeAccent"
        />
        <div>
          <p class="text-sm font-medium">自定义颜色</p>
          <output class="text-xs tabular-nums text-muted-foreground" aria-label="当前颜色">{{ themeAccent }}</output>
        </div>
        <Button
          size="sm"
          root-class="theme-reset"
          :disabled="themeAccent === defaultThemeAccent"
          @click="setThemeAccent(defaultThemeAccent)"
        >
          恢复默认色
        </Button>
      </div>
      <p class="text-xs text-muted-foreground">主题设置保存在当前浏览器。</p>
    </section>
  </PagePanel>
</template>

<script setup lang="ts">
import { ElColorPicker } from 'element-plus'
import PagePanel from '@/components/ai/PagePanel.vue'
import PanelHeader from '@/components/ai/PanelHeader.vue'
import { Button, SegmentedTabs } from '@/components/ui'
import { defaultThemeAccent, setThemeAccent, setThemeMode, themeAccent, themeMode, themePresets } from '@/lib/theme'

const modeOptions = [
  { value: 'light', label: '亮色' },
  { value: 'dark', label: '暗色' },
] as const
</script>

<style scoped>
.theme-panel {
  --segmented-selected-bg: var(--selection-background);
  --segmented-selected-color: var(--selection-foreground);
  display: grid;
  width: min(100%, 48rem);
  gap: 24px;
}

.theme-section {
  display: grid;
  justify-items: start;
  gap: 12px;
}

.theme-presets {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.theme-presets .theme-preset {
  justify-content: flex-start;
  margin: 0;
  padding-inline: 12px;
}

.theme-presets .theme-preset[aria-pressed="true"] {
  border-color: hsl(var(--primary));
  background: var(--selection-background);
  color: var(--selection-foreground);
}

.theme-swatch {
  width: 16px;
  height: 16px;
  flex: none;
  border: 1px solid hsl(var(--foreground) / 0.14);
  border-radius: 50%;
}

.theme-custom {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.theme-custom .theme-reset {
  margin-inline-start: 8px;
}

@media (max-width: 640px) {
  .theme-presets { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
