<script setup lang="ts">
import { computed } from 'vue'
import EmptyState from './EmptyState.vue'
import LoadingState from './LoadingState.vue'
const props = withDefaults(defineProps<{
  loading?: boolean; loadingColspan?: number; loadingTitle?: string; loadingDescription?: string
  showEmpty?: boolean; emptyColspan?: number; emptyTitle?: string; emptyDescription?: string
  fill?: boolean; scrollMode?: 'auto' | 'contained' | 'page'; hoverRows?: boolean; stickyHeader?: boolean
  footerBorder?: boolean; unframed?: boolean; rootClass?: string; wrapperClass?: string
  scrollClass?: string; tableClass?: string; headClass?: string; bodyClass?: string; footerClass?: string
  variant?: string; size?: string
}>(), { scrollMode: 'auto', emptyColspan: 1, emptyTitle: '暂无数据' })
const contained = computed(() => props.scrollMode === 'contained' || (props.scrollMode === 'auto' && props.fill))
</script>
<template>
  <section class="lux-table-shell" :class="[rootClass || wrapperClass, { 'lux-table-shell--contained': contained, 'lux-table-shell--unframed': unframed }]">
    <div class="lux-table-scroll" :class="scrollClass">
      <table class="lux-table" :class="[tableClass, { 'lux-table--hover': hoverRows, 'lux-table--sticky': stickyHeader }]">
        <colgroup v-if="$slots.colgroup"><slot name="colgroup" /></colgroup>
        <thead :class="headClass"><slot name="head" /></thead>
        <tbody v-if="!loading && !showEmpty" :class="bodyClass"><slot /></tbody>
      </table>
      <div v-if="loading || showEmpty" class="lux-table-state">
        <slot v-if="loading" name="loading"><LoadingState :title="loadingTitle" :description="loadingDescription" compact /></slot>
        <slot v-else name="empty"><EmptyState :title="emptyTitle" :description="emptyDescription" size="sm" plain /></slot>
      </div>
    </div>
    <footer v-if="$slots.footer" class="lux-table-footer" :class="[footerClass, { 'border-t border-border': footerBorder }]"><slot name="footer" /></footer>
  </section>
</template>
