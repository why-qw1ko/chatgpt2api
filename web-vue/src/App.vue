<template>
  <ElConfigProvider :locale="zhCn" :z-index="4000">
    <RouterView />
    <AmbientCursor />
  </ElConfigProvider>
</template>

<script setup lang="ts">
import AmbientCursor from '@/components/ui/AmbientCursor.vue'
import { RouterView } from 'vue-router'
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
</script>
