<script setup lang="ts">
import { ElCard, ElStatistic } from 'element-plus'
import { Icon } from '@iconify/vue'
import type { Tone } from './types'
defineProps<{ label: string; value: string | number; caption?: string; icon?: string; iconTone?: Tone; iconBg?: string; iconColor?: string; rootClass?: string; panelClass?: string; variant?: string; size?: string }>()
</script>
<template>
  <ElCard shadow="never" class="lux-stat-card" :class="[rootClass, panelClass]">
    <div class="flex items-center justify-between gap-2"><span class="lux-stat-label">{{ label }}</span><span v-if="icon" class="lux-stat-icon" :class="[`lux-stat-icon--${iconTone || 'neutral'}`, iconBg, iconColor]"><Icon :icon="icon" class="h-4 w-4" /></span></div>
    <ElStatistic v-if="typeof value === 'number'" :value="value" /><strong v-else class="lux-stat-value">{{ value }}</strong>
    <p v-if="caption" class="mt-2 text-xs text-muted-foreground">{{ caption }}</p>
  </ElCard>
</template>
