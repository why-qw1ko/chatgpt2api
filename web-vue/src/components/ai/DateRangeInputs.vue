<template>
  <div class="date-range-inputs" role="group" aria-label="日期范围">
    <Input
      :model-value="start"
      type="date"
      aria-label="开始日期"
      :root-class="['date-range-input', inputRootClass].filter(Boolean).join(' ')"
      @update:model-value="emit('update:start', String($event || ''))"
    />
    <span class="date-range-separator" aria-hidden="true">{{ separator }}</span>
    <Input
      :model-value="end"
      type="date"
      aria-label="结束日期"
      :root-class="['date-range-input', inputRootClass].filter(Boolean).join(' ')"
      @update:model-value="emit('update:end', String($event || ''))"
    />
  </div>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui'

withDefaults(defineProps<{
  start?: string
  end?: string
  separator?: string
  inputRootClass?: string
}>(), {
  start: '',
  end: '',
  separator: '至',
  inputRootClass: '',
})

const emit = defineEmits<{
  'update:start': [value: string]
  'update:end': [value: string]
}>()
</script>

<style scoped>
.date-range-inputs {
  --date-column-min-width: var(--date-range-input-min-width, 7.25rem);
  display: grid;
  grid-template-columns: minmax(var(--date-column-min-width), 1fr) max-content minmax(var(--date-column-min-width), 1fr);
  align-items: center;
  gap: 8px;
  flex: var(--date-range-flex, 0 1 17rem);
  min-width: var(--date-range-min-width, min(100%, 16rem));
  max-width: 100%;
}

:deep(.date-range-input) {
  width: 100%;
  min-width: 0;
}

:deep(.date-range-input .el-input__wrapper) {
  min-width: 0;
}

.date-range-separator {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

@media (max-width: 640px) {
  .date-range-inputs {
    --date-column-min-width: 0px;
    width: 100%;
    min-width: 0;
  }
}
</style>
